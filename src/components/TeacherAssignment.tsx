import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Calendar, Trash2, Save, Plus } from "lucide-react";
import { toast } from "sonner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface Teacher {
  id: string;
  name: string;
  is_active: boolean;
  level: 'shs' | 'college' | 'both';
  subjects: string[];
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
  const [newTeacher, setNewTeacher] = useState<{name: string, level: 'shs' | 'college' | 'both', subjects: string[]}>({
    name: "",
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
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [editTeacherName, setEditTeacherName] = useState<string>("");
  const [editTeacherSubjects, setEditTeacherSubjects] = useState<string>("");

  // SHS strands and sections
  const shsStrandSections: SHSStrandSection[] = [
    { strand: "ABM", sections: ['9-1', '9-2', '8-1'] },
    { strand: "GAS", sections: ['9-1', '9-2', '8-1'] },
    { strand: "HUMSS", sections: ['9-1', '9-2', '9-3', '9-4', '8-1', '8-2'] },
    { strand: "TVL", sections: ['9-1', '8-1'] },
  ];
  
  // College courses and sections
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
      // Load teachers from Supabase
      const { data: teachersData, error: teachersError } = await supabase
        .from('teachers')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (teachersError) {
        console.error('Error loading teachers:', teachersError);
        toast.error('Failed to load teachers');
        return;
      }

      setTeachers((teachersData || []) as Teacher[]);
      console.log('Loaded teacher ids:', (teachersData || []).map((t: any) => t.id));

      // Load other data from localStorage for now
      const storedCollegeAssignments = localStorage.getItem("collegeAssignments");
      const storedSHSAssignments = localStorage.getItem("shsAssignments");
      const storedSemesterConfig = localStorage.getItem("semesterConfig");
      
      if (storedCollegeAssignments) {
        setCollegeAssignments(JSON.parse(storedCollegeAssignments));
      }
      
      if (storedSHSAssignments) {
        setSHSAssignments(JSON.parse(storedSHSAssignments));
      }
      
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
  
  // Note: Teachers are now stored in Supabase, not localStorage
  
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
      const { error } = await supabase
        .from('teachers')
        .insert({
          name: newTeacher.name.trim(),
          level: newTeacher.level,
          subjects: newTeacher.subjects,
          is_active: true
        });
      if (error) {
        console.error('Error adding teacher:', error);
        toast.error('Failed to add teacher');
        return;
      }
      await reloadTeachers();
      setNewTeacher({ name: "", level: "both", subjects: [] });
      toast.success("Teacher added successfully");
    } catch (error) {
      console.error('Error adding teacher:', error);
      toast.error('Failed to add teacher');
    }
  };

  const reloadTeachers = async () => {
    const { data: teachersData, error: teachersError } = await supabase
      .from('teachers')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (!teachersError) {
      setTeachers((teachersData || []) as Teacher[]);
    }
  };

  const removeTeacher = async (id: string) => {
    try {
      const { data, error, status } = await supabase
        .from('teachers')
        .delete()
        .eq('id', id);
      console.log('Delete result:', { data, error, status, id });
      if (error) {
        console.error('Error deleting teacher:', error);
        toast.error('Failed to delete teacher');
        return;
      }
      await reloadTeachers();
      toast.success('Teacher deleted successfully');
    } catch (error) {
      console.error('Error removing teacher:', error);
      toast.error('Failed to remove teacher');
    }
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
    
    // Check if this subject is already assigned for this section
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
    
    // Check if this section already has assignments
    const existingAssignmentIndex = shsAssignments.findIndex(
      a => a.strandCourse === selectedSHSStrand && a.section === selectedSHSSection
    );
    
    if (existingAssignmentIndex >= 0) {
      // Update existing assignment
      const updatedAssignments = [...shsAssignments];
      const assignment = updatedAssignments[existingAssignmentIndex];
      
      // Check if teacher is already assigned
      if (!assignment.teacherIds.includes(newSHSTeacher)) {
        assignment.teacherIds.push(newSHSTeacher);
      }
      
      // Check if subject is already assigned
      if (!assignment.subjects.includes(newSHSSubject.trim())) {
        assignment.subjects.push(newSHSSubject.trim());
      } else {
        toast.error("This subject is already assigned to this section");
        return;
      }
      
      setSHSAssignments(updatedAssignments);
    } else {
      // Create new assignment
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
      
      // Remove the teacher and subject at the specified index
      if (assignment.teacherIds.length > index && assignment.subjects.length > index) {
        assignment.teacherIds.splice(index, 1);
        assignment.subjects.splice(index, 1);
        
        // If no teachers/subjects left, remove the whole assignment
        if (assignment.teacherIds.length === 0) {
          updatedAssignments.splice(assignmentIndex, 1);
        }
        
        setSHSAssignments(updatedAssignments);
        toast.success("Assignment removed successfully");
      }
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
  
  // Get filtered college assignments based on selected course and section
  const getFilteredCollegeAssignments = () => {
    if (!selectedCollegeCourse || !selectedCollegeSection) return [];
    const sectionId = `${selectedCollegeCourse} ${selectedCollegeSection}`;
    return collegeAssignments.filter(a => a.sectionId === sectionId);
  };
  
  // Get filtered SHS assignments based on selected strand and section
  const getFilteredSHSAssignments = () => {
    if (!selectedSHSStrand || !selectedSHSSection) return null;
    
    return shsAssignments.find(
      a => a.strandCourse === selectedSHSStrand && a.section === selectedSHSSection
    );
  };

  const startEditTeacher = (teacher: Teacher) => {
    setEditingTeacherId(teacher.id);
    setEditTeacherName(teacher.name);
    setEditTeacherSubjects(teacher.subjects.join(", "));
  };

  const saveEditTeacher = async () => {
    if (!editingTeacherId) return;
    try {
      const { error } = await supabase
        .from('teachers')
        .update({
          name: editTeacherName,
          subjects: editTeacherSubjects.split(',').map(s => s.trim()).filter(s => s)
        })
        .eq('id', editingTeacherId);
      if (error) {
        console.error('Error updating teacher:', error);
        toast.error('Failed to update teacher');
        return;
      }
      await reloadTeachers();
      setEditingTeacherId(null);
      setEditTeacherName("");
      setEditTeacherSubjects("");
      toast.success('Teacher updated successfully');
    } catch (error) {
      console.error('Error updating teacher:', error);
      toast.error('Failed to update teacher');
    }
  };

  const cancelEditTeacher = () => {
    setEditingTeacherId(null);
    setEditTeacherName("");
    setEditTeacherSubjects("");
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
                {/* Filter Section */}
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

                {/* Add Teacher Form */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 border rounded-lg bg-muted/30">
                  <div>
                    <Label>Teacher Name</Label>
                    <Input 
                      placeholder="Full Name" 
                      value={newTeacher.name} 
                      onChange={(e) => setNewTeacher({...newTeacher, name: e.target.value})} 
                    />
                  </div>
                  <div>
                    <Label>Teaching Level</Label>
                    <Select value={newTeacher.level} onValueChange={(value: 'shs' | 'college' | 'both') => setNewTeacher({...newTeacher, level: value})}>
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
                      onChange={(e) => setNewTeacher({...newTeacher, subjects: e.target.value.split(',').map(s => s.trim()).filter(s => s)})} 
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
                            <TableCell className="font-medium">
                              {editingTeacherId === teacher.id ? (
                                <Input value={editTeacherName} onChange={e => setEditTeacherName(e.target.value)} />
                              ) : (
                                teacher.name
                              )}
                            </TableCell>
                         
                            <TableCell>
                              <Badge variant="outline">
                                {teacher.level === 'shs' ? 'Senior High School' : 
                                 teacher.level === 'college' ? 'College' : 'Both Levels'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {editingTeacherId === teacher.id ? (
                                <Input value={editTeacherSubjects} onChange={e => setEditTeacherSubjects(e.target.value)} />
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {teacher.subjects?.slice(0, 3).map((subject, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {subject}
                                    </Badge>
                                  ))}
                                  {(teacher.subjects?.length || 0) > 3 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{(teacher.subjects?.length || 0) - 3} more
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={teacher.is_active ? "default" : "secondary"}>
                                {teacher.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {editingTeacherId === teacher.id ? (
                                <>
                                  <Button size="sm" onClick={saveEditTeacher} className="mr-2">Save</Button>
                                  <Button size="sm" variant="outline" onClick={cancelEditTeacher}>Cancel</Button>
                                </>
                              ) : (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => removeTeacher(teacher.id)}
                                    className="text-red-600 hover:text-red-700 mr-2"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => startEditTeacher(teacher)}
                                  >
                                    Edit
                                  </Button>
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      {teachers.filter(teacher => levelFilter === 'all' || teacher.level === levelFilter).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6">
                            No teachers found for the selected filter
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
        
        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle>Teacher Section Assignments</CardTitle>
              <CardDescription>Assign teachers to specific strands/courses and sections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Current Assignments Display */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Current Assignments</h3>
                  <div className="grid gap-4">
                    {/* College Assignments */}
                    {collegeAssignments.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle>College Assignments</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          {collegeAssignments.map((assignment) => (
                            <div key={assignment.id} className="flex justify-between items-center border-b py-2">
                              <div>
                                <div className="font-medium">{getTeacherName(assignment.teacherId)}</div>
                                <div className="text-xs text-muted-foreground">{assignment.subject} - {assignment.sectionId}</div>
                              </div>
                              <Button variant="outline" size="sm" onClick={() => removeCollegeAssignment(assignment.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                    {/* SHS Assignments */}
                    {shsAssignments.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle>SHS Assignments</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          {shsAssignments.map((assignment, idx) => (
                            <div key={assignment.id} className="mb-4 border-b pb-2">
                              <div className="font-medium">{assignment.strandCourse} - {assignment.section}</div>
                              {assignment.subjects.map((subject, i) => (
                                <div key={i} className="flex justify-between items-center mt-1">
                                  <span className="text-xs text-muted-foreground">{getTeacherName(assignment.teacherIds[i])}: {subject}</span>
                                  <Button variant="outline" size="sm" onClick={() => removeSHSAssignment(assignment.strandCourse, assignment.section, i)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                    {/* If no assignments */}
                    {collegeAssignments.length === 0 && shsAssignments.length === 0 && (
                      <Card><CardContent className="p-4 text-center text-muted-foreground">No current assignments.</CardContent></Card>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="assignments">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* College Assignments */}
            <Card>
              <CardHeader>
                <CardTitle>College Level Assignments</CardTitle>
                <CardDescription>Assign teachers to subjects for specific sections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-4">
                    {/* Course Selection */}
                    <div>
                      <h3 className="text-sm font-medium mb-2">Select Course</h3>
                      <Select 
                        value={selectedCollegeCourse} 
                        onValueChange={setSelectedCollegeCourse}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Course" />
                        </SelectTrigger>
                        <SelectContent>
                          {collegeSections.map((course) => (
                            <SelectItem key={course.course} value={course.course}>
                              {course.course}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Section Selection */}
                    <div>
                      <h3 className="text-sm font-medium mb-2">Select Section</h3>
                      <Select 
                        value={selectedCollegeSection} 
                        onValueChange={setSelectedCollegeSection}
                        disabled={!selectedCollegeCourse}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Section" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedCollegeCourse && 
                            collegeSections
                              .find(c => c.course === selectedCollegeCourse)
                              ?.sections.map((section) => (
                                <SelectItem key={section} value={section}>
                                  {section}
                                </SelectItem>
                              ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <h3 className="text-sm font-medium mb-2">Add Subject and Teacher</h3>
                    </div>
                    
                    {/* Subject Name */}
                    <Input 
                      placeholder="Subject Name" 
                      value={newCollegeSubject} 
                      onChange={(e) => setNewCollegeSubject(e.target.value)} 
                      disabled={!selectedCollegeCourse || !selectedCollegeSection}
                    />
                    
                    {/* Teacher Selection */}
                      <Select 
                        value={newCollegeTeacher || ""} 
                        onValueChange={(value) => setNewCollegeTeacher(value)}
                        disabled={!selectedCollegeCourse || !selectedCollegeSection}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Teacher" />
                        </SelectTrigger>
                        <SelectContent>
                          {teachers.filter(t => t.is_active).map((teacher) => (
                            <SelectItem key={teacher.id} value={teacher.id}>
                              {teacher.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    
                    <Button 
                      onClick={addCollegeAssignment}
                      disabled={!selectedCollegeCourse || !selectedCollegeSection}
                    >
                      Assign to Subject
                    </Button>
                  </div>
                  
                  <div className="border rounded-md mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead>Teacher</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getFilteredCollegeAssignments().length > 0 ? (
                          getFilteredCollegeAssignments().map((assignment) => (
                            <TableRow key={assignment.id}>
                              <TableCell className="font-medium">{assignment.subject}</TableCell>
                              <TableCell>{getTeacherName(assignment.teacherId)}</TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => removeCollegeAssignment(assignment.id)}
                                  className="text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-6">
                              {selectedCollegeCourse && selectedCollegeSection 
                                ? "No assignments yet for this section" 
                                : "Please select a course and section"}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* SHS Assignments */}
            <Card>
              <CardHeader>
                <CardTitle>Senior High School Assignments</CardTitle>
                <CardDescription>Assign teachers to sections with subjects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-4">
                    {/* Strand Selection */}
                    <div>
                      <h3 className="text-sm font-medium mb-2">Select Strand</h3>
                      <Select 
                        value={selectedSHSStrand} 
                        onValueChange={setSelectedSHSStrand}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Strand" />
                        </SelectTrigger>
                        <SelectContent>
                          {shsStrandSections.map((strand) => (
                            <SelectItem key={strand.strand} value={strand.strand}>
                              {strand.strand}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Section Selection */}
                    <div>
                      <h3 className="text-sm font-medium mb-2">Select Section</h3>
                      <Select 
                        value={selectedSHSSection} 
                        onValueChange={setSelectedSHSSection}
                        disabled={!selectedSHSStrand}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Section" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedSHSStrand && 
                            shsStrandSections
                              .find(s => s.strand === selectedSHSStrand)
                              ?.sections.map((section) => (
                                <SelectItem key={section} value={section}>
                                  {section}
                                </SelectItem>
                              ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <h3 className="text-sm font-medium mb-2">Add Teacher and Subject</h3>
                    </div>
                    
                    {/* Teacher Selection */}
                    <Select 
                      value={newSHSTeacher || ""} 
                      onValueChange={(value) => setNewSHSTeacher(value)}
                      disabled={!selectedSHSStrand || !selectedSHSSection}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Teacher" />
                      </SelectTrigger>
                      
                    </Select>
                    
                    {/* Subject for SHS */}
                    <Input 
                      placeholder="Subject Name" 
                      value={newSHSSubject} 
                      onChange={(e) => setNewSHSSubject(e.target.value)}
                      disabled={!selectedSHSStrand || !selectedSHSSection} 
                    />
                    
                    <Button 
                      onClick={addSHSAssignment}
                      disabled={!selectedSHSStrand || !selectedSHSSection}
                    >
                      Assign to Section
                    </Button>
                  </div>
                  
                  <div className="border rounded-md mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead>Teacher</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getFilteredSHSAssignments() ? (
                          getFilteredSHSAssignments()?.subjects.map((subject, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{subject}</TableCell>
                              <TableCell>
                                {getFilteredSHSAssignments()?.teacherIds[index] 
                                  ? getTeacherName(getFilteredSHSAssignments()?.teacherIds[index]!) 
                                  : "Unknown"}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => removeSHSAssignment(selectedSHSStrand, selectedSHSSection, index)}
                                  className="text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-6">
                              {selectedSHSStrand && selectedSHSSection 
                                ? "No assignments yet for this section" 
                                : "Please select a strand and section"}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Settings</CardTitle>
              <CardDescription>Configure semester and evaluation dates</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...semesterForm}>
                <form onSubmit={semesterForm.handleSubmit(updateSemesterConfig)} className="space-y-4">
                  <FormField
                    control={semesterForm.control}
                    name="semester"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Semester</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Semester" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1st Semester">1st Semester</SelectItem>
                            <SelectItem value="2nd Semester">2nd Semester</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
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
                          <div className="flex items-center">
                            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                            <Input type="date" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full md:w-auto">
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
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
