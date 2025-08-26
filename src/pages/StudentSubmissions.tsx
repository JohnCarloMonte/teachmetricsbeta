import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SubmissionSummary } from "@/components/SubmissionSummary";

interface Submission {
  id: number;
  teacher_name: string;
  overall_rating: number;
  positive_feedback?: string;
  suggestions?: string;
}

const StudentSubmissions = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [flatQuestions, setFlatQuestions] = useState<any[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<any[]>([]);
  const [matrixRatings, setMatrixRatings] = useState<any>({});
  const [teacherComments, setTeacherComments] = useState<any>({});

  useEffect(() => {
    const fetchSubmissions = async () => {
      const studentData = localStorage.getItem("studentUser");
      if (!studentData) return;
      const student = JSON.parse(studentData);
      const { data, error } = await supabase
        .from("evaluation1")
        .select("id, teacher_id, teacher_name, overall_rating, positive_feedback, suggestions, answers")
        .eq("student_id", student.id);
      if (error) {
        toast.error("Failed to fetch submissions");
        return;
      }
      setSubmissions(data || []);
      // Fetch questions
      const { data: questionsData } = await supabase.from('questions').select('id, text, category');
      setFlatQuestions(questionsData || []);
      // Fetch teachers
      const teacherIds = Array.from(new Set((data || []).map((s: any) => s.teacher_id)));
      const { data: teachersData } = await supabase.from('teachers').select('id, name').in('id', teacherIds);
      setAvailableTeachers((teachersData || []).map((t: any) => ({ teacher: t })));
      // Build matrixRatings and teacherComments
      const ratings: any = {};
      const comments: any = {};
      (data || []).forEach((sub: any) => {
        const answers = typeof sub.answers === 'string' ? JSON.parse(sub.answers) : sub.answers;
        Object.entries(answers).forEach(([qid, rating]) => {
          if (!ratings[qid]) ratings[qid] = {};
          ratings[qid][sub.teacher_id] = rating;
        });
        comments[sub.teacher_id] = {
          positive: sub.positive_feedback,
          improvement: sub.suggestions
        };
      });
      setMatrixRatings(ratings);
      setTeacherComments(comments);
      setLoading(false);
    };

    fetchSubmissions();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading submissions...</p>
        </div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">No submissions found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      {submissions.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">No submissions yet.</div>
      ) : (
        <table className="min-w-full border">
          <thead>
            <tr>
              <th className="border px-2 py-1">Teacher</th>
              <th className="border px-2 py-1">Overall Rating</th>
              <th className="border px-2 py-1">Feedback</th>
              <th className="border px-2 py-1">Suggestions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((sub) => (
              <tr key={sub.id}>
                <td className="border px-2 py-1">{sub.teacher_name}</td>
                <td className="border px-2 py-1 text-center">{sub.overall_rating ? `${sub.overall_rating}%` : "-"}</td>
                <td className="border px-2 py-1">{sub.positive_feedback || "-"}</td>
                <td className="border px-2 py-1">{sub.suggestions || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Detailed Submission Summary</h2>
        <SubmissionSummary
          flatQuestions={flatQuestions}
          availableTeachers={availableTeachers}
          matrixRatings={matrixRatings}
        
        />
      </div>
    </div>
  );
};

export default StudentSubmissions;
