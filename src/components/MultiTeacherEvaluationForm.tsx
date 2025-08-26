import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, User, Star, BookOpen, Plus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SingleTeacherEvaluation from "./SingleTeacherEvaluation";
import AddTeacherModal from "./AddTeacherModal";
import { Label } from "@/components/ui/label";
import { SubmissionSummary } from "./SubmissionSummary";

interface Teacher {
  id: string;
  name: string;
  level: string;
  is_active: boolean;
  subjects: string[];
  department: string;
}

interface TeacherWithSubjects {
  teacher: Teacher;
  subjects: string[];
}

interface MultiTeacherEvaluationFormProps {
  currentUser: {
    id: string;
    usn: string;
    fullName: string;
    strandCourse: string;
    section: string;
    level: 'shs' | 'college';
  };
}

interface Evaluation {
  teacherId: string;
  teacherName?: string;
  teacherPosition?: string;
  positiveComments?: string;
  suggestions?: string;
  answers: { [key: string]: number };
}

const ratingOptions = [
  { value: 5, label: "Always" },
  { value: 4, label: "Often" },
  { value: 3, label: "Regularly" },
  { value: 2, label: "Seldom" },
  { value: 1, label: "Never" }
];

// Flatten questions for navigation
let flatQuestions: { id: string; text: string; category: string }[] = [];

const MultiTeacherEvaluationForm = ({ currentUser }: MultiTeacherEvaluationFormProps) => {
  const [availableTeachers, setAvailableTeachers] = useState<TeacherWithSubjects[]>([]);
  const [currentTeacherIndex, setCurrentTeacherIndex] = useState(0);
  const [allAssignedTeachers, setAllAssignedTeachers] = useState<TeacherWithSubjects[]>([]);
  const [loading, setLoading] = useState(true);

  // Collect all pending evaluations before submitting
  const [pendingEvaluations, setPendingEvaluations] = useState<{ [teacherId: string]: any }>({});
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [questionGroups, setQuestionGroups] = useState<{ category: string, questions: { id: string, text: string }[] }[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [matrixRatings, setMatrixRatings] = useState<{ [questionId: string]: { [teacherId: string]: number } }>({});

  // --- SUBJECT SELECTION FOR COLLEGE STUDENTS ---
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [allSubjects, setAllSubjects] = useState<string[]>([]);
  const [subjectSelectionDone, setSubjectSelectionDone] = useState(false);

  // --- Add comment fields for each teacher ---
  const [teacherComments, setTeacherComments] = useState<{ [teacherId: string]: { positive: string; improvement: string } }>({});
  const handleCommentChange = (teacherId: string, type: 'positive' | 'improvement', value: string) => {
    setTeacherComments(prev => ({
      ...prev,
      [teacherId]: {
        ...prev[teacherId],
        [type]: value
      }
    }));
  };

  const [alreadyEvaluated, setAlreadyEvaluated] = useState(false);

  useEffect(() => {
    const checkAlreadyEvaluated = async () => {
      const { data } = await supabase
        .from('evaluation1')
        .select('id')
        .eq('student_id', currentUser.id);
      if (data && data.length > 0) {
        setAlreadyEvaluated(true);
      } else {
        setAlreadyEvaluated(false);
      }
    };
    checkAlreadyEvaluated();
    loadData();
    fetchQuestions();
    // eslint-disable-next-line
  }, [currentUser]);

  const fetchPersonalList = async () => {
    const { data: personalList } = await supabase
      .from('student_evaluation_lists')
      .select('teacher_id, subject')
      .eq('student_id', currentUser.id);
    console.log('student_evaluation_lists:', personalList);

    const teacherMap = new Map<string, { teacher: Teacher, subjects: string[] }>();
    if (personalList && personalList.length > 0) {
      for (const item of personalList) {
        // Fetch teacher details from teachers table
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('*')
          .eq('id', item.teacher_id)
          .single();
        console.log('teacherData for', item.teacher_id, teacherData);
        if (teacherData && teacherData.is_active) {
          const teacherId = teacherData.id;
          if (!teacherMap.has(teacherId)) {
            teacherMap.set(teacherId, {
              teacher: teacherData,
              subjects: []
            });
          }
          teacherMap.get(teacherId)!.subjects.push(item.subject);
        }
      }
    }
    const result = Array.from(teacherMap.values());
    console.log('fetchPersonalList result:', result);
    return result;
  };

const loadData = async () => {
  setLoading(true);
  try {
    let teachersWithSubjects: TeacherWithSubjects[] = [];
    if (currentUser.level === 'shs') {
      // Build section code from strand and section, e.g., HUMSS 9-1
      const sectionCode = `${currentUser.strandCourse} ${currentUser.section}`;
      // Fetch SHS teachers assigned to this section
      const { data: shsTeachers, error: shsError } = await supabase
        .from('teachers')
        .select('*')
        .in('level', ['shs', 'both'])
        .eq('is_active', true)
        .contains('sections', [sectionCode]);
      if (shsError) throw shsError;
      teachersWithSubjects = (shsTeachers || []).map((teacher: Teacher) => ({
        teacher,
        subjects: teacher.subjects || []
      }));
    } else {
      // 1. Get all teacher assignments for this student's section
      const { data: assignments, error: assignmentsError } = await supabase
        .from('teacher_assignments')
        .select(`
          teacher_id,
          subject,
          teachers:teacher_id (
            id,
            name,
            level,
            is_active,
            subjects,
            department
          )
        `)
        .eq('level', currentUser.level)
        .eq('strand_course', currentUser.strandCourse)
        .eq('section', currentUser.section);

      // 2. Get personal evaluation list for college students
      let personalList: TeacherWithSubjects[] = [];
      if (currentUser.level === 'college') {
        personalList = await fetchPersonalList();
      }

      // Group by teacher from assignments
      const teacherMap = new Map<string, { teacher: Teacher, subjects: string[] }>();
      assignments?.forEach((assignment: any) => {
        if (assignment.teachers && assignment.teachers.is_active) {
          const teacherId = assignment.teachers.id;
          if (!teacherMap.has(teacherId)) {
            teacherMap.set(teacherId, {
              teacher: assignment.teachers,
              subjects: []
            });
          }
          teacherMap.get(teacherId)!.subjects.push(assignment.subject);
        }
      });
      // Add personal list teachers (merge, avoid duplicates)
      personalList.forEach((item) => {
        const teacherId = item.teacher.id;
        if (!teacherMap.has(teacherId)) {
          teacherMap.set(teacherId, item);
        } else {
          // Merge subjects if teacher exists in both
          teacherMap.get(teacherId)!.subjects = Array.from(new Set([...teacherMap.get(teacherId)!.subjects, ...item.subjects]));
        }
      });
      teachersWithSubjects = Array.from(teacherMap.values());
    }
    // 3. Get all evaluations by this student
    const { data: previousEvaluations } = await supabase
      .from('evaluations')
      .select('teacher_id')
      .eq('student_id', currentUser.id);
    const evaluatedTeacherIds = new Set(previousEvaluations?.map(e => e.teacher_id) || []);
    // 4. Filter out already evaluated teachers
    const unevaluatedTeachers = teachersWithSubjects.filter(({ teacher }) => {
      return !evaluatedTeacherIds.has(teacher.id);
    });
    setAllAssignedTeachers(teachersWithSubjects);
    setAvailableTeachers(unevaluatedTeachers);
    // Auto-select first teacher if needed
    if (unevaluatedTeachers.length > 0) {
      if (currentTeacherIndex >= unevaluatedTeachers.length || currentTeacherIndex < 0) {
        setCurrentTeacherIndex(0);
      }
    }
  } catch (err) {
    toast.error("Error loading teachers");
    setAvailableTeachers([]);
    setAllAssignedTeachers([]);
  }
  setLoading(false);
};

  // Fetch questions from DB and group by category
  const fetchQuestions = async () => {
    const { data, error } = await supabase.from('questions').select('id, text, category, category_name, text_filipino');
    if (error) {
      toast.error('Failed to load questions');
      return;
    }
    // Group questions by category
    const grouped: { [cat: string]: { id: string, text: string, category_name?: string, text_filipino?: string }[] } = {};
    (data || []).forEach(q => {
      if (!grouped[q.category]) grouped[q.category] = [];
      grouped[q.category].push({ id: q.id, text: q.text, category_name: q.category_name, text_filipino: q.text_filipino });
    });
    setQuestionGroups(Object.entries(grouped).map(([category, questions]) => ({ category, questions })));
  };

  // Save each teacher's evaluation to local state
  const handleSaveEvaluation = (evaluation: any) => {
    setPendingEvaluations(prev => ({
      ...prev,
      [evaluation.teacherId]: evaluation
    }));
  };

  // Submit all evaluations at once
  const handleFinalSubmit = async () => {
    setIsSubmittingAll(true);
    try {
      // Verify if the student_id exists in the profiles table
      const { data: studentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', currentUser.id)
        .single();

      if (profileError || !studentProfile) {
        console.warn("Student profile not found. Creating a new profile.");
        const { error: createProfileError } = await supabase.from('profiles').insert({
          id: currentUser.id,
          full_name: currentUser.fullName,
          usn: currentUser.usn,
          strand_course: currentUser.strandCourse,
          section: currentUser.section,
          level: currentUser.level,
          role: 'student'
        });

        if (createProfileError) {
          console.error("Failed to create student profile:", createProfileError);
          toast.error("Failed to create your profile. Please contact the administrator.");
          setIsSubmittingAll(false);
          return;
        } else {
          console.log("Student profile created successfully.");
        }

        // Re-fetch the profile to ensure it exists before proceeding
        const { data: reFetchedProfile, error: reFetchError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', currentUser.id)
          .single();

        if (reFetchError || !reFetchedProfile) {
          console.error("Failed to verify the created profile:", reFetchError);
          toast.error("Profile verification failed. Please try again.");
          setIsSubmittingAll(false);
          return;
        }
      }

      const evaluationsArray = Object.values(pendingEvaluations).map((evaluation: Evaluation) => {
        const overallRating = Math.ceil(
          Object.values(evaluation.answers).reduce((sum, rating) => sum + rating, 0) /
            Object.values(evaluation.answers).length
        ) || 5;

        return {
          student_id: currentUser.id,
          teacher_id: evaluation.teacherId,
          teacher_name: evaluation.teacherName || "",
          student_name: currentUser.fullName,
          student_usn: currentUser.usn,
          level: currentUser.level,
          strand_course: currentUser.strandCourse,
          section: currentUser.section,
          overall_rating: overallRating,
          teaching_effectiveness: overallRating, // FIX: Provide value for NOT NULL column
          positive_feedback: evaluation.positiveComments || "",
          suggestions: evaluation.suggestions || "",
          answers: evaluation.answers || {}
        };
      });

      const { error } = await supabase.from('evaluations').insert(evaluationsArray);

      if (error) {
        console.error("Error submitting evaluations:", error);
        toast.error("Failed to submit evaluations. Please check the data and try again.");
      } else {
        toast.success("All evaluations submitted successfully!");
        setSubmitted(true);
      }
    } catch (error) {
      console.error("Unexpected error during submission:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmittingAll(false);
    }
  };

  // --- Matrix submit handler for all teachers/questions ---
  const handleMatrixSubmit = async () => {
    setIsSubmittingAll(true);
    try {
      // Prepare evaluations for each teacher
      const evaluationsArray = availableTeachers.map(t => {
        // Calculate per-teacher overall and category ratings
        let overallScore = 0;
        let overallMax = 0;
        const categoryScores: { [cat: string]: { score: number; max: number } } = {};
        flatQuestions.forEach(q => {
          const rating = matrixRatings[q.id]?.[t.teacher.id] || 0;
          if (!categoryScores[q.category]) categoryScores[q.category] = { score: 0, max: 0 };
          categoryScores[q.category].score += rating;
          categoryScores[q.category].max += 5;
          overallScore += rating;
          overallMax += 5;
        });
        const overallRating = overallMax > 0 ? Math.round((overallScore / overallMax) * 100) : 0;
        return {
          student_id: currentUser.id,
          teacher_id: t.teacher.id,
          teacher_name: t.teacher.name,
          student_name: currentUser.fullName,
          student_usn: currentUser.usn,
          level: currentUser.level,
          strand_course: currentUser.strandCourse,
          section: currentUser.section,
          overall_rating: overallRating,
          teaching_effectiveness: overallRating,
          category_ratings: JSON.stringify(categoryScores),
          positive_feedback: teacherComments[t.teacher.id]?.positive || '',
          suggestions: teacherComments[t.teacher.id]?.improvement || '',
          answers: JSON.stringify(Object.fromEntries(flatQuestions.map(q => [q.id, matrixRatings[q.id]?.[t.teacher.id] || 0])))
        };
      });
      const { error } = await supabase.from('evaluation1').insert(evaluationsArray);
      if (error) {
        toast.error('Failed to submit evaluations: ' + error.message);
      } else {
        toast.success('Evaluations submitted!');
        setSubmitted(true);
      }
    } catch (err) {
      toast.error('Unexpected error during submission');
    } finally {
      setIsSubmittingAll(false);
    }
  };

  // Navigation handlers
  const goToNextTeacher = () => {
    if (currentTeacherIndex < availableTeachers.length - 1) {
      setCurrentTeacherIndex(prev => prev + 1);
    }
  };
  const goToPreviousTeacher = () => {
    if (currentTeacherIndex > 0) {
      setCurrentTeacherIndex(prev => prev - 1);
    }
  };

  // Only allow final submit if all teachers have been evaluated
  const allEvaluated = Object.keys(pendingEvaluations).length === availableTeachers.length;

  // New functions to load submissions and evaluated teachers count
  const loadTeachersEvaluatedCount = useCallback(async () => {
    try {
      const { data: teachersEvaluated, error } = await supabase
        .from('evaluations')
        .select('teacher_id');

      if (error) {
        console.error("Error fetching teachers evaluated count:", error);
        toast.error("Failed to load teachers evaluated count. Please try again.");
        return 0;
      }

      // Use a Set to count unique teacher IDs
      const uniqueTeacherIds = new Set(teachersEvaluated?.map((evaluation) => evaluation.teacher_id));
      return uniqueTeacherIds.size;
    } catch (err) {
      console.error("Unexpected error loading teachers evaluated count:", err);
      toast.error("An unexpected error occurred. Please try again.");
      return 0;
    }
  }, []);

  const loadMySubmissions = useCallback(async () => {
    try {
      const { data: myEvaluations, error } = await supabase
        .from('evaluations')
        .select(`
          teacher_id,
          teacher_name,
          overall_rating,
          positive_feedback,
          suggestions
        `)
        .eq('student_id', currentUser.id);

      if (error) {
        console.error("Error fetching my submissions:", error);
        toast.error("Failed to load your submissions. Please try again.");
        return [];
      }

      return myEvaluations || [];
    } catch (err) {
      console.error("Unexpected error loading submissions:", err);
      toast.error("An unexpected error occurred. Please try again.");
      return [];
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const submissions = await loadMySubmissions();
        const teachersCount = await loadTeachersEvaluatedCount();

        console.log("My Submissions:", submissions);
        console.log("Teachers Evaluated Count:", teachersCount);
      } catch (err) {
        console.error("Error during data fetch:", err);
        toast.error("An error occurred while loading data. Please try again.");
      }
    };

    fetchData();
  }, [currentUser, loadMySubmissions, loadTeachersEvaluatedCount]); // Added missing dependency

  // Add/Remove teacher for college students
  const handleAddTeacher = async (teacher: TeacherWithSubjects) => {
    if (currentUser.level === 'college') {
      const subject = teacher.subjects[0] || '';
      if (!subject) {
        toast.error('Please select a valid subject for this teacher.');
        return;
      }
      const { error } = await supabase
        .from('student_evaluation_lists')
        .insert([{
          student_id: currentUser.id,
          teacher_id: teacher.teacher.id,
          level: currentUser.level,
          strand_course: currentUser.strandCourse,
          section: currentUser.section,
          subject: subject
        }]);
      if (error) {
        toast.error('Error adding teacher to evaluation list: ' + error.message);
        return;
      } else {
        toast.success('Teacher added to evaluation list');
        await loadData(); // Reload teacher list after insert
        return;
      }
    }
    setAvailableTeachers(prev => [...prev, teacher]);
    setAllAssignedTeachers(prev => [...prev, teacher]);
  };
  const handleRemoveTeacher = (teacherId: string) => {
    setAvailableTeachers(prev => prev.filter(t => t.teacher.id !== teacherId));
    setAllAssignedTeachers(prev => prev.filter(t => t.teacher.id !== teacherId));
    setPendingEvaluations(prev => {
      const copy = { ...prev };
      delete copy[teacherId];
      return copy;
    });
  };

  useEffect(() => {
    if (currentUser.level === 'college') {
      setAllSubjects([
        "Art Appreciation",
        "Business Opportunity Seeking",
        "Calculus 1",
        "Capstone Project 1",
        "Capstone Project 2",
        "Computer Programming 1",
        "Computing Fundamentals",
        "Current Trends and Issues",
        "Data Communication and Networking 1",
        "Data Communication and Networking 3",
        "Data Structures and Algorithms",
        "Database Management System 1 (Oracle)",
        "Elective 3 -Wholesale and Retail Sales Mgt",
        "Entrepreneurial Leadership in an Organization",
        "Ethics",
        "Euthenics 1",
        "Euthenics 2",
        "Fundamentals of Accounting Theory & Practice 1B",
        "Gender and Society",
        "Individual/Dual Sports",
        "Information Assurance and Security 2",
        "Information Management",
        "International Business and Trade",
        "Introduction to Human Computer Interaction",
        "Introduction to Multimedia",
        "IT Major Elective 1 (Linux Administration)",
        "IT Major Elective 3  (Web Application 1)",
        "IT Major Elective 4  (Data Communication and Networking 2)",
        "IT Major Elective 5 (Web Application 1)",
        "IT Major Elective 6 (Web Application 2)",
        "IT Practicum (486 hours)",
        "Kritikal na Pagbasa, Pagsulat at pagsasalita",
        "Living in the IT Era (GE Elective 1)",
        "Load Testing",
        "Microeconomics",
        "National Service Training Program 1 -CWTS",
        "National Service Training Program 2",
        "Pagsasaling Pampanitikan",
        "PATHFIT 1 (Movement Competency Training)",
        "PATHFIT 2 (Exercised-based Fitness Activities)",
        "Pricing and Costing/ Mr. Maisa",
        "Principles of Operating Systems and Its Applications",
        "Production Operations Management and TQM",
        "Purposive Communication 1",
        "Quantitative Methods",
        "Readings in Philippine History",
        "Science, Technology and Society",
        "Social and Professional Issues",
        "Software Engineering 1",
        "System Integration and Architecture 1",
        "Understanding the Self",
        "Unified Functional Testing (HP)"
      ]);
    }
  }, [currentUser.level]);

  // --- SHOW TEACHERS FROM TEACHERS TABLE WHO HAVE ANY SELECTED SUBJECT ---
  useEffect(() => {
    if (!subjectSelectionDone || selectedSubjects.length === 0) return;
    const fetchTeachersForSubjects = async () => {
      const { data: teachersData, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('is_active', true);
      if (error) {
        toast.error('Failed to load teachers');
        return;
      }
      // Filter teachers whose subjects array includes any selected subject
      const filteredTeachers = (teachersData || []).filter((teacher) =>
        teacher.subjects.some((subj: string) => selectedSubjects.includes(subj))
      ).map((teacher) => ({
        teacher,
        subjects: teacher.subjects.filter((subj: string) => selectedSubjects.includes(subj))
      }));
      setAvailableTeachers(filteredTeachers);
      setAllAssignedTeachers(filteredTeachers);
    };
    fetchTeachersForSubjects();
  }, [subjectSelectionDone, selectedSubjects]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Card>
          <CardContent className="text-center py-8">
            <p>Loading evaluation data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- NEW MATRIX LAYOUT ---
  if (submitted) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Evaluation Submitted
            </CardTitle>
            <CardDescription>
              Thank you for submitting your evaluations. You are already finished evaluating and cannot evaluate again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubmissionSummary
              flatQuestions={flatQuestions}
              availableTeachers={availableTeachers}
              matrixRatings={matrixRatings}
              teacherComments={teacherComments}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (alreadyEvaluated) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Evaluation Finished
            </CardTitle>
            <CardDescription>
              You already finished evaluating, thank you.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // --- After questionGroups is set, update flatQuestions ---
  flatQuestions = questionGroups.flatMap(g => g.questions.map(q => ({ ...q, category: g.category })));

  const currentQuestion = flatQuestions[currentQuestionIndex];

  // Extract category code and name
  let categoryDisplay = "";
  if (currentQuestion?.category) {
    const match = currentQuestion.category.match(/^(\w+\.)\s*(.*)$/);
    if (match) {
      categoryDisplay = match[1] + " " + (currentQuestion.category_name || match[2]);
    } else {
      categoryDisplay = currentQuestion.category + '.' +(currentQuestion.category_name ? (" " + currentQuestion.category_name) : "");
    }
  }

  if (!currentQuestion) {
    return <div className="max-w-4xl mx-auto p-4">Loading questions...</div>;
  }

  // Add this function to handle rating changes
  const handleMatrixRatingChange = (questionId: string, teacherId: string, value: number) => {
    setMatrixRatings(prev => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || {}),
        [teacherId]: value
      }
    }));
  };

  // Check if all teachers are rated for the current question
  const allTeachersRated = availableTeachers.length > 0 && availableTeachers.every(
    teacher => matrixRatings[currentQuestion.id]?.[teacher.teacher.id] !== undefined
  );

  // --- SUBMISSION SUMMARY VIEW ---
  function getSubmissionSummary(flatQuestions: any[], availableTeachers: any[], matrixRatings: any, teacherComments?: any) {
    return (
      <div className="mt-6">
        <h2 className="text-lg font-bold mb-2">Your Evaluation Submission</h2>
        {availableTeachers.map(t => {
          // Calculate per-teacher category ratings and overall
          const categoryScores: { [cat: string]: { score: number; max: number } } = {};
          let overallScore = 0;
          let overallMax = 0;
          flatQuestions.forEach(q => {
            const rating = matrixRatings[q.id]?.[t.teacher.id] || 0;
            if (!categoryScores[q.category]) categoryScores[q.category] = { score: 0, max: 0 };
            categoryScores[q.category].score += rating;
            categoryScores[q.category].max += 5;
            overallScore += rating;
            overallMax += 5;
          });
          const overallPercent = overallMax > 0 ? Math.round((overallScore / overallMax) * 100) : 0;
          return (
            <div key={t.teacher.id} className="mb-8 p-4 border rounded bg-gray-50">
              <div className="font-bold text-lg mb-2">{t.teacher.name}</div>
              <div className="mb-2"><strong>Overall Rating:</strong> {overallPercent}%</div>
              <div className="mb-2">
                <strong>Category Ratings:</strong>
                <ul>
                  {Object.entries(categoryScores).map(([cat, { score, max }]) => (
                    <li key={cat}>{cat}: {max > 0 ? Math.round((score / max) * 100) : 0}%</li>
                  ))}
                </ul>
              </div>
              <div className="mb-2">
                <strong>Comments:</strong>
                <div><strong>Positive:</strong> {teacherComments?.[t.teacher.id]?.positive || '-'}</div>
                <div><strong>Needs Improvement:</strong> {teacherComments?.[t.teacher.id]?.improvement || '-'}</div>
              </div>
              <table className="min-w-full border mb-2">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">Question</th>
                    <th className="border px-2 py-1">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {flatQuestions.map(q => (
                    <tr key={q.id + '-' + t.teacher.id}>
                      <td className="border px-2 py-1">{q.text}</td>
                      <td className="border px-2 py-1 text-center">{matrixRatings[q.id]?.[t.teacher.id] || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    );
  };

  // --- SUBJECT SELECTION UI ---
  if (currentUser.level === 'college' && !subjectSelectionDone) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Select Your Subjects</CardTitle>
            <CardDescription>Pick all subjects you are enrolled in this semester.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Label>Select Subjects</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded p-2 bg-white">
                {allSubjects.map(subj => (
                  <label key={subj} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      value={subj}
                      checked={selectedSubjects.includes(subj)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedSubjects(prev => [...prev, subj]);
                        } else {
                          setSelectedSubjects(prev => prev.filter(s => s !== subj));
                        }
                      }}
                    />
                    <span>{subj}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={() => setSubjectSelectionDone(true)} disabled={selectedSubjects.length === 0}>
              Proceed to Evaluation
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <div className="mb-2">
            <span className="text-lg font-bold">{categoryDisplay}</span>
          </div>
          <CardDescription className="font-bold mt-2">{currentQuestion.text}</CardDescription>
          {currentQuestion.text_filipino && (
            <CardDescription className="italic text-muted-foreground">{currentQuestion.text_filipino}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Teacher</th>
                  {ratingOptions.map(opt => (
                    <th key={opt.value} className="border px-2 py-1">{opt.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {availableTeachers.map((teacher) => (
                  <tr key={teacher.teacher.id}>
                    <td className="border px-2 py-1 font-medium">{teacher.teacher.name}</td>
                    {ratingOptions.map(opt => (
                      <td key={opt.value} className="border px-2 py-1 text-center">
                        <input
                          type="radio"
                          name={`rating-${currentQuestion.id}-${teacher.teacher.id}`}
                          value={opt.value}
                          checked={matrixRatings[currentQuestion.id]?.[teacher.teacher.id] === opt.value}
                          onChange={() => handleMatrixRatingChange(currentQuestion.id, teacher.teacher.id, opt.value)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* --- Show comment fields only on last question --- */}
          {currentQuestionIndex === flatQuestions.length - 1 && (
            <div className="mt-6">
              <h3 className="font-bold mb-2">Comments for Each Teacher</h3>
              {availableTeachers.map(t => (
                <div key={t.teacher.id} className="mb-4 p-2 border rounded bg-gray-50">
                  <div className="font-semibold mb-1">{t.teacher.name}</div>
                  <label className="block mb-1 text-sm">Positive Comment</label>
                  <textarea
                    className="w-full border rounded p-1 mb-2"
                    value={teacherComments[t.teacher.id]?.positive || ''}
                    onChange={e => handleCommentChange(t.teacher.id, 'positive', e.target.value)}
                    required
                  />
                  <label className="block mb-1 text-sm">Needs Improvement</label>
                  <textarea
                    className="w-full border rounded p-1"
                    value={teacherComments[t.teacher.id]?.improvement || ''}
                    onChange={e => handleCommentChange(t.teacher.id, 'improvement', e.target.value)}
                    required
                  />
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between mt-6">
            <Button onClick={() => setCurrentQuestionIndex(idx => Math.max(0, idx - 1))} disabled={currentQuestionIndex === 0}>
              Previous Question
            </Button>
            {currentQuestionIndex < flatQuestions.length - 1 ? (
              <Button 
                onClick={() => setCurrentQuestionIndex(idx => Math.min(flatQuestions.length - 1, idx + 1))}
                disabled={!allTeachersRated}
              >
                Next Question
              </Button>
            ) : (
              <Button onClick={handleMatrixSubmit} disabled={isSubmittingAll || !allTeachersRated}>
                {isSubmittingAll ? "Submitting..." : "Submit Evaluation"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MultiTeacherEvaluationForm;
