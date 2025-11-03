import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Calendar, Trash2, Save, Plus, Edit2, X } from "lucide-react";
import { toast } from "sonner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface Teacher {
  id: string;
  name: string;
  department: string;
  is_active: boolean;
  level: 'shs' | 'college' | 'both';
  subjects: string[];
  isEditing?: boolean;
}

interface CollegeAssignment {
  id: number;
  subject: string;
  teacherId: string;
  sectionId: string;
}

interface SHSAssignment {
  id: number;
  section: string;
  strandCourse: string;
  teacherIds: string[];
  subjects: string[];
}

interface SemesterConfig {
  semester: string;
  evaluationDate: string;
}

interface SHSStrandSection {
  strand: string;
  sections: string[];
}

interface CollegeCourseSection {
  course: string;
  sections: string[];
}

const TeacherAssignment = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [newTeacher, setNewTeacher] = useState<{
    name: string;
    department: string;
    level: 'shs' | 'college' | 'both';
    subjects: string[];
  }>({
    name: "",
    department: "",
    level: "both",
    subjects: []
  });
  const [levelFilter, setLevelFilter] = useState<'all' | 'shs' | 'college' | 'both'>('all');
  const [newTeacherSubject, setNewTeacherSubject] = useState("");
  const [collegeAssignments, setCollegeAssignments] = useState<CollegeAssignment[]>([]);
  const [shsAssignments, setSHSAssignments] = useState<SHSAssignment[]>([]);
  const [newCollegeSubject, setNewCollegeSubject] = useState("");
  const [newCollegeTeacher, setNewCollegeTeacher] = useState<string | null>(null);
  const [selectedCollegeSection, setSelectedCollegeSection] = useState<string>("");
  const [selectedCollegeCourse, setSelectedCollegeCourse] = useState<string>("");
  const [selectedSHSStrand, setSelectedSHSStrand] = useState<string>("");
  const [selectedSHSSection, setSelectedSHSSection] = useState<string>("");
  const [newSHSTeacher, setNewSHSTeacher] = useState<string | null>(null);
  const [newSHSSubject, setNewSHSSubject] = useState("");
  const [semesterConfig, setSemesterConfig] = useState<SemesterConfig>({
    semester: "1st Semester",
    evaluationDate: new Date().toISOString().split('T')[0]
  });

  const shsStrandSections: SHSStrandSection[] = [
    { strand: "ABM", sections: ['9-1', '9-2', '8-1'] },
    { strand: "GAS", sections: ['9-1', '9-2', '8-1'] },
    { strand: "HUMSS", sections: ['9-1', '9-2', '9-3', '9-4', '8-1', '8-2'] },
    { strand: "TVL", sections: ['9-1', '8-1'] },
  ];

  const collegeSections: CollegeCourseSection[] = [
    { course: "BSIT", sections: ['1-1', '2-1', '3-1', '4-1'] },
    { course: "ACT", sections: ['1-1', '2-1'] },
    { course: "BSE", sections: ['1-1', '2-1', '3-1', '4-1'] },
  ];

  const semesterForm = useForm<SemesterConfig>({
    defaultValues: semesterConfig
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: teachersData, error: teachersError } = await supabase
        .from('teachers')
        .select('*')
        .order('name');

      if (teachersError) {
        console.error('Error loading teachers:', teachersError);
        toast.error('Failed to load teachers');
        return;
      }

      setTeachers((teachersData || []) as Teacher[]);

      const storedCollegeAssignments = localStorage.getItem("collegeAssignments");
      const storedSHSAssignments = localStorage.getItem("shsAssignments");
      const storedSemesterConfig = localStorage.getItem("semesterConfig");

      if (storedCollegeAssignments) setCollegeAssignments(JSON.parse(storedCollegeAssignments));
      if (storedSHSAssignments) setSHSAssignments(JSON.parse(storedSHSAssignments));
      if (storedSemesterConfig) {
        const config = JSON.parse(storedSemesterConfig);
        setSemesterConfig(config);
        semesterForm.reset(config);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    }
  };

  useEffect(() => {
    localStorage.setItem("collegeAssignments", JSON.stringify(collegeAssignments));
  }, [collegeAssignments]);

  useEffect(() => {
    localStorage.setItem("shsAssignments", JSON.stringify(shsAssignments));
  }, [shsAssignments]);

  useEffect(() => {
    localStorage.setItem("semesterConfig", JSON.stringify(semesterConfig));
  }, [semesterConfig]);

  const addTeacher = async () => {
    if (!newTeacher.name.trim()) {
      toast.error("Teacher name is required");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('teachers')
        .insert({
          name: newTeacher.name.trim(),
          level: newTeacher.level,
          subjects: newTeacher.subjects,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding teacher:', error);
        toast.error('Failed to add teacher');
        return;
      }

      setTeachers([...teachers, data as Teacher]);
      setNewTeacher({ name: "", level: "both", subjects: [], department: "" });
      toast.success("Teacher added successfully");
    } catch (error) {
      console.error('Error adding teacher:', error);
      toast.error('Failed to add teacher');
    }
  };

const removeTeacher = async (id: string) => {
  if (!confirm("Are you sure you want to permanently delete this teacher? This cannot be undone.")) {
    return;
  }

  try {
    const { error } = await supabase
      .from('teachers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting teacher:', error);
      toast.error('Failed to delete teacher');
      return;
    }

    // Remove from UI
    setTeachers(prev => prev.filter(t => t.id !== id));
    toast.success('Teacher deleted permanently');
  } catch (err) {
    console.error('Unexpected error:', err);
    toast.error('Failed to delete teacher');
  }
};

  // EDIT FUNCTIONS - NOW INSIDE COMPONENT
  const toggleEdit = (id: string) => {
    setTeachers(prev =>
      prev.map(t => t.id === id ? { ...t, isEditing: true } : t)
    );
  };

  const cancelEdit = (id: string) => {
    setTeachers(prev =>
      prev.map(t => t.id === id ? { ...t, isEditing: false } : t)
    );
  };

  const saveTeacher = async (id: string) => {
    const teacher = teachers.find(t => t.id === id);
    if (!teacher) return;

    try {
      const { error } = await supabase
        .from('teachers')
        .update({
          name: teacher.name,
          level: teacher.level,
          subjects: teacher.subjects
        })
        .eq('id', id);

      if (error) {
        toast.error('Failed to save changes');
        return;
      }

      setTeachers(prev =>
        prev.map(t => t.id === id ? { ...t, isEditing: false } : t)
      );
      toast.success('Teacher updated successfully');
    } catch (err) {
      toast.error('Failed to save changes');
    }
  };

  const updateTeacherField = (id: string, field: keyof Teacher, value: any) => {
    setTeachers(prev =>
      prev.map(t => t.id === id ? { ...t, [field]: value } : t)
    );
  };

  const addCollegeAssignment = () => {
    if (!newCollegeSubject.trim()) {
      toast.error("Subject name is required");
      return;
    }
    if (!newCollegeTeacher) {
      toast.error("Please select a teacher");
      return;
    }
    if (!selectedCollegeCourse || !selectedCollegeSection) {
      toast.error("Please select a course and section");
      return;
    }

    const sectionId = `${selectedCollegeCourse} ${selectedCollegeSection}`;
    const isDuplicate = collegeAssignments.some(
      a => a.subject === newCollegeSubject.trim() && a.sectionId === sectionId
    );

    if (isDuplicate) {
      toast.error("This subject is already assigned to this section");
      return;
    }

    const newAssignment: CollegeAssignment = {
      id: Date.now(),
      subject: newCollegeSubject.trim(),
      teacherId: newCollegeTeacher,
      sectionId: sectionId
    };

    setCollegeAssignments([...collegeAssignments, newAssignment]);
    setNewCollegeSubject("");
    setNewCollegeTeacher(null);
    toast.success("Subject assignment added successfully");
  };

  const removeCollegeAssignment = (id: number) => {
    setCollegeAssignments(collegeAssignments.filter(a => a.id !== id));
    toast.success("Subject assignment removed");
  };

  const addSHSAssignment = () => {
    if (!selectedSHSStrand || !selectedSHSSection) {
      toast.error("Please select a strand and section");
      return;
    }
    if (!newSHSTeacher) {
      toast.error("Please select a teacher");
      return;
    }
    if (!newSHSSubject.trim()) {
      toast.error("Subject name is required");
      return;
    }

    const sectionKey = `${selectedSHSStrand} ${selectedSHSSection}`;
    const existingAssignmentIndex = shsAssignments.findIndex(
      a => a.strandCourse === selectedSHSStrand && a.section === selectedSHSSection
    );

    if (existingAssignmentIndex >= 0) {
      const updatedAssignments = [...shsAssignments];
      const assignment = updatedAssignments[existingAssignmentIndex];

      if (!assignment.teacherIds.includes(newSHSTeacher)) {
        assignment.teacherIds.push(newSHSTeacher);
      }
      if (!assignment.subjects.includes(newSHSSubject.trim())) {
        assignment.subjects.push(newSHSSubject.trim());
      } else {
        toast.error("This subject is already assigned to this section");
        return;
      }

      setSHSAssignments(updatedAssignments);
    } else {
      const newAssignment: SHSAssignment = {
        id: Date.now(),
        section: selectedSHSSection,
        strandCourse: selectedSHSStrand,
        teacherIds: [newSHSTeacher],
        subjects: [newSHSSubject.trim()]
      };
      setSHSAssignments([...shsAssignments, newAssignment]);
    }

    setNewSHSSubject("");
    setNewSHSTeacher(null);
    toast.success("Teacher and subject assigned to section successfully");
  };

  const removeSHSAssignment = (strandCourse: string, section: string, index: number) => {
    const assignmentIndex = shsAssignments.findIndex(
      a => a.strandCourse === strandCourse && a.section === section
    );

    if (assignmentIndex >= 0) {
      const updatedAssignments = [...shsAssignments];
      const assignment = updatedAssignments[assignmentIndex];
      assignment.teacherIds.splice(index, 1);
      assignment.subjects.splice(index, 1);

      if (assignment.teacherIds.length === 0) {
        updatedAssignments.splice(assignmentIndex, 1);
      }

      setSHSAssignments(updatedAssignments);
      toast.success("Assignment removed successfully");
    }
  };

  const updateSemesterConfig = (data: SemesterConfig) => {
    setSemesterConfig(data);
    toast.success("Semester settings updated successfully");
  };

  const getTeacherName = (id: string) => {
    const teacher = teachers.find(t => t.id === id);
    return teacher ? teacher.name : "Unknown";
  };

  const getFilteredCollegeAssignments = () => {
    if (!selectedCollegeCourse || !selectedCollegeSection) return [];
    const sectionId = `${selectedCollegeCourse} ${selectedCollegeSection}`;
    return collegeAssignments.filter(a => a.sectionId === sectionId);
  };

  const getFilteredSHSAssignments = () => {
    if (!selectedSHSStrand || !selectedSHSSection) return null;
    return shsAssignments.find(
      a => a.strandCourse === selectedSHSStrand && a.section === selectedSHSSection
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Teacher Assignment & Evaluation Settings</h1>

      <Tabs defaultValue="teachers">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="teachers">Manage Teachers</TabsTrigger>
        </TabsList>

        <TabsContent value="teachers">
          <Card>
            <CardHeader>
              <CardTitle>Teacher Management</CardTitle>
              <CardDescription>Add teachers and assign their subjects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <Label>Filter by Level:</Label>
                    <Select value={levelFilter} onValueChange={(value: 'all' | 'shs' | 'college' | 'both') => setLevelFilter(value)}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="shs">Senior High School</SelectItem>
                        <SelectItem value="college">College</SelectItem>
                        <SelectItem value="both">Both Levels</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 p-4 bg-muted/30">
                  <div>
                    <Label>Teacher Name</Label>
                    <Input
                      placeholder="Full Name"
                      value={newTeacher.name}
                      onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Teaching Level</Label>
                    <Select value={newTeacher.level} onValueChange={(value: 'shs' | 'college' | 'both') => setNewTeacher({ ...newTeacher, level: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shs">Senior High School</SelectItem>
                        <SelectItem value="college">College</SelectItem>
                        <SelectItem value="both">Both Levels</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subjects (comma-separated)</Label>
                    <Input
                      placeholder="Math, Science, English"
                      value={newTeacher.subjects.join(', ')}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.endsWith(',')) {
                          const subjects = val.split(',').map(s => s.trim()).filter(s => s);
                          setNewTeacher({ ...newTeacher, subjects });
                        } else {
                          const parts = val.split(',');
                          const last = parts.pop() || '';
                          const prev = parts.map(s => s.trim()).filter(s => s);
                          setNewTeacher({ ...newTeacher, subjects: [...prev, last] });
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addTeacher} className="w-full">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Teacher
                    </Button>
                  </div>
                </div>

                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Subjects</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teachers
                        .filter(teacher => levelFilter === 'all' || teacher.level === levelFilter)
                        .map((teacher) => (
                         <TableRow key={teacher.id}>
  {/* ---------- NAME ---------- */}
  <TableCell className="font-medium">
    {teacher.isEditing ? (
      <Input
        value={teacher.name}
        onChange={(e) => updateTeacherField(teacher.id, 'name', e.target.value)}
        className="h-8"
      />
    ) : (
      teacher.name
    )}
  </TableCell>

  {/* ---------- LEVEL ---------- */}
  <TableCell>
    {teacher.isEditing ? (
      <Select
        value={teacher.level}
        onValueChange={(v: 'shs' | 'college' | 'both') =>
          updateTeacherField(teacher.id, 'level', v)
        }
      >
        <SelectTrigger className="h-8 w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="shs">SHS</SelectItem>
          <SelectItem value="college">College</SelectItem>
          <SelectItem value="both">Both</SelectItem>
        </SelectContent>
      </Select>
    ) : (
      <Badge variant="outline">
        {teacher.level === 'shs' ? 'SHS' : teacher.level === 'college' ? 'College' : 'Both'}
      </Badge>
    )}
  </TableCell>

  {/* ---------- SUBJECTS (YOUR STYLE) ---------- */}
  <TableCell className="border-none bg-transparent">
    {teacher.isEditing ? (
      <Input
        value={teacher.subjects.join(', ')}
        onChange={(e) => {
          const val = e.target.value;
          const subjects = val.split(',').map((s) => s.trim()).filter(Boolean);
          updateTeacherField(teacher.id, 'subjects', subjects);
        }}
        placeholder="Math, Science"
        className="h-8"
      />
    ) : (
      <div className="flex flex-col gap-1">
        {teacher.subjects
          ?.join('-')
          .split('-')
          .map((subject, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="text-xs w-fit bg-transparent border-none shadow-none text-black"
            >
              {subject.trim()}
            </Badge>
          ))}
      </div>
    )}
  </TableCell>

  {/* ---------- STATUS ---------- */}
  <TableCell>
    <Badge variant={teacher.is_active ? 'default' : 'secondary'}>
      {teacher.is_active ? 'Active' : 'Inactive'}
    </Badge>
  </TableCell>

  {/* ---------- ACTIONS (Edit / Save / Cancel / Delete) ---------- */}
  <TableCell className="text-right">
    {teacher.isEditing ? (
      <div className="flex justify-end gap-1">
        {/* SAVE */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => saveTeacher(teacher.id)}
          className="text-green-600 hover:bg-green-50"
        >
          <Save className="h-4 w-4" />
        </Button>

        {/* CANCEL */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => cancelEdit(teacher.id)}
          className="text-gray-600 hover:bg-gray-50"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    ) : (
      <div className="flex justify-end gap-1">
        {/* EDIT */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => toggleEdit(teacher.id)}
          className="text-blue-600 hover:bg-blue-50"
        >
          <Edit2 className="h-4 w-4" />
        </Button>

        {/* DELETE */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => removeTeacher(teacher.id)}
          className="text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )}
  </TableCell>
</TableRow>
                        ))}
                      {teachers.filter(t => levelFilter === 'all' || t.level === levelFilter).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                            No teachers found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ASSIGNMENTS TAB */}
        <TabsContent value="assignments">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* College Assignments */}
            <Card>
              <CardHeader>
                <CardTitle>College Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Select value={selectedCollegeCourse} onValueChange={setSelectedCollegeCourse}>
                    <SelectTrigger><SelectValue placeholder="Select Course" /></SelectTrigger>
                    <SelectContent>
                      {collegeSections.map(c => <SelectItem key={c.course} value={c.course}>{c.course}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Select value={selectedCollegeSection} onValueChange={setSelectedCollegeSection} disabled={!selectedCollegeCourse}>
                    <SelectTrigger><SelectValue placeholder="Select Section" /></SelectTrigger>
                    <SelectContent>
                      {selectedCollegeCourse && collegeSections.find(c => c.course === selectedCollegeCourse)?.sections.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder="Subject Name"
                    value={newCollegeSubject}
                    onChange={e => setNewCollegeSubject(e.target.value)}
                    disabled={!selectedCollegeSection}
                  />

                  <Select value={newCollegeTeacher || ""} onValueChange={setNewCollegeTeacher} disabled={!selectedCollegeSection}>
                    <SelectTrigger><SelectValue placeholder="Select Teacher" /></SelectTrigger>
                    <SelectContent>
                      {teachers.filter(t => t.is_active).map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button onClick={addCollegeAssignment} className="w-full" disabled={!selectedCollegeSection}>
                    <Plus className="mr-2 h-4 w-4" /> Assign
                  </Button>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Teacher</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredCollegeAssignments().length > 0 ? (
                        getFilteredCollegeAssignments().map(a => (
                          <TableRow key={a.id}>
                            <TableCell>{a.subject}</TableCell>
                            <TableCell>{getTeacherName(a.teacherId)}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost" onClick={() => removeCollegeAssignment(a.id)} className="text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            {selectedCollegeSection ? "No assignments" : "Select course & section"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* SHS Assignments */}
            <Card>
              <CardHeader>
                <CardTitle>SHS Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Select value={selectedSHSStrand} onValueChange={setSelectedSHSStrand}>
                    <SelectTrigger><SelectValue placeholder="Select Strand" /></SelectTrigger>
                    <SelectContent>
                      {shsStrandSections.map(s => <SelectItem key={s.strand} value={s.strand}>{s.strand}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Select value={selectedSHSSection} onValueChange={setSelectedSHSSection} disabled={!selectedSHSStrand}>
                    <SelectTrigger><SelectValue placeholder="Select Section" /></SelectTrigger>
                    <SelectContent>
                      {selectedSHSStrand && shsStrandSections.find(s => s.strand === selectedSHSStrand)?.sections.map(sec => (
                        <SelectItem key={sec} value={sec}>{sec}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={newSHSTeacher || ""} onValueChange={setNewSHSTeacher} disabled={!selectedSHSSection}>
                    <SelectTrigger><SelectValue placeholder="Select Teacher" /></SelectTrigger>
                    <SelectContent>
                      {teachers.filter(t => t.is_active).map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder="Subject Name"
                    value={newSHSSubject}
                    onChange={e => setNewSHSSubject(e.target.value)}
                    disabled={!selectedSHSSection}
                  />

                  <Button onClick={addSHSAssignment} className="w-full" disabled={!selectedSHSSection}>
                    <Plus className="mr-2 h-4 w-4" /> Assign
                  </Button>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Teacher</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredSHSAssignments()?.subjects.map((subject, i) => (
                        <TableRow key={i}>
                          <TableCell>{subject}</TableCell>
                          <TableCell>{getTeacherName(getFilteredSHSAssignments()?.teacherIds[i] || "")}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeSHSAssignment(selectedSHSStrand, selectedSHSSection, i)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )) || (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            {selectedSHSSection ? "No assignments" : "Select strand & section"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...semesterForm}>
                <form onSubmit={semesterForm.handleSubmit(updateSemesterConfig)} className="space-y-4">
                  <FormField
                    control={semesterForm.control}
                    name="semester"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Semester</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1st Semester">1st Semester</SelectItem>
                            <SelectItem value="2nd Semester">2nd Semester</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={semesterForm.control}
                    name="evaluationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Evaluation Date</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <Input type="date" {...field} />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button type="submit">
                    <Save className="mr-2 h-4 w-4" /> Save Settings
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeacherAssignment;
