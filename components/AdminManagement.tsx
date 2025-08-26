import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit, Save, X, Eye, EyeOff, Key } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface Strand {
  id: string;
  name: string;
  sections: string[];
  subjects: string[];
}

interface Course {
  id: string;
  name: string;
  sections: string[];
  subjects: string[];
}

interface Question {
  id: string;
  text: string;
  category: string;
}

interface User {
  id: number;
  fullName: string;
  usn: string;
  strandCourse: string;
  section: string;
  level: 'shs' | 'college';
  password: string;
}

const UserManagementTab = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editingPassword, setEditingPassword] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<{userId: string, field: string} | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{[key: string]: string}>({});

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    }
  };

  const updateUserPassword = async (userId: string, password: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ password: password })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, password } : user
      ));

      toast.success('Password updated successfully');
      setEditingPassword(null);
      setNewPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password');
    }
  };

  const updateUserField = async (userId: string, field: string, value: string) => {
    try {
      const updateData: any = {};
      if (field === 'fullName') updateData.full_name = value;
      if (field === 'usn') updateData.usn = value;

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, [field === 'fullName' ? 'full_name' : field]: value } : user
      ));

      toast.success(`${field === 'fullName' ? 'Name' : 'USN'} updated successfully`);
      setEditingField(null);
      setEditValues({});
    } catch (error) {
      console.error('Error updating user field:', error);
      toast.error(`Failed to update ${field === 'fullName' ? 'name' : 'USN'}`);
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPassword(showPassword === userId ? null : userId);
  };

  const startEditing = (userId: string, field: string, currentValue: string) => {
    setEditingField({ userId, field });
    setEditValues({ [userId + field]: currentValue });
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValues({});
  };

  const saveField = (userId: string, field: string) => {
    const value = editValues[userId + field];
    if (value && value.trim()) {
      updateUserField(userId, field, value.trim());
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Users</CardTitle>
        <CardDescription>View and manage all student accounts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No users found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>USN</TableHead>
                  <TableHead>Course/Section</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      {editingField?.userId === user.id && editingField?.field === 'fullName' ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editValues[user.id + 'fullName'] || ''}
                            onChange={(e) => setEditValues(prev => ({...prev, [user.id + 'fullName']: e.target.value}))}
                            className="w-full"
                          />
                          <Button size="sm" onClick={() => saveField(user.id, 'fullName')}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditing}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>{user.full_name}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditing(user.id, 'fullName', user.full_name || '')}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingField?.userId === user.id && editingField?.field === 'usn' ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editValues[user.id + 'usn'] || ''}
                            onChange={(e) => setEditValues(prev => ({...prev, [user.id + 'usn']: e.target.value}))}
                            className="w-full"
                          />
                          <Button size="sm" onClick={() => saveField(user.id, 'usn')}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditing}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>{user.usn}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditing(user.id, 'usn', user.usn || '')}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{user.strand_course} {user.section}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {user.password || 'student123'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Key className="h-4 w-4 mr-1" />
                            Change Password
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Change Password for {user.full_name}</DialogTitle>
                            <DialogDescription>
                              Enter a new password for this user.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="newPassword">New Password</Label>
                              <Input
                                id="newPassword"
                                type="text"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                onClick={() => setNewPassword('')}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={() => updateUserPassword(user.id, newPassword)}
                                disabled={!newPassword.trim()}
                              >
                                Update Password
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const AdminManagement = () => {
  const [strands, setStrands] = useState<Strand[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingStrand, setEditingStrand] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Fetch strands
    try {
      const { data: strandRows, error: strandError } = await supabase.from('strands').select('*');
      if (strandError) throw strandError;
      // Fetch sections and subjects for each strand
      const strandsWithDetails = await Promise.all((strandRows || []).map(async (strand) => {
        const { data: sectionRows } = await supabase.from('strand_sections').select('name').eq('strand_id', strand.id);
        const { data: subjectRows } = await supabase.from('strand_subjects').select('name').eq('strand_id', strand.id);
        return {
          ...strand,
          sections: sectionRows ? sectionRows.map(s => s.name) : [],
          subjects: subjectRows ? subjectRows.map(s => s.name) : [],
        };
      }));
      setStrands(strandsWithDetails);
    } catch (error) {
      toast.error('Failed to load strands');
    }

    // Fetch courses
    try {
      const { data: courseRows, error: courseError } = await supabase.from('courses').select('*');
      if (courseError) throw courseError;
      // Fetch sections and subjects for each course
      const coursesWithDetails = await Promise.all((courseRows || []).map(async (course) => {
        const { data: sectionRows } = await supabase.from('course_sections').select('name').eq('course_id', course.id);
        const { data: subjectRows } = await supabase.from('course_subjects').select('name').eq('course_id', course.id);
        return {
          ...course,
          sections: sectionRows ? sectionRows.map(s => s.name) : [],
          subjects: subjectRows ? subjectRows.map(s => s.name) : [],
        };
      }));
      setCourses(coursesWithDetails);
    } catch (error) {
      toast.error('Failed to load courses');
    }

    // Fetch questions
    try {
      const { data: questionRows, error: questionError } = await supabase.from('questions').select('*');
      if (questionError) throw questionError;
      setQuestions(questionRows || []);
    } catch (error) {
      toast.error('Failed to load questions');
    }
  };

  // Strand management functions
  const addStrand = () => {
    const newStrand: Strand = {
      id: `STRAND_${Date.now()}`,
      name: '',
      sections: [],
      subjects: []
    };
    const updatedStrands = [...strands, newStrand];
    setStrands(updatedStrands);
    localStorage.setItem('adminStrands', JSON.stringify(updatedStrands));
    setEditingStrand(newStrand.id);
  };

  const updateStrand = (id: string, field: keyof Strand, value: any) => {
    const updatedStrands = strands.map(strand => 
      strand.id === id ? { ...strand, [field]: value } : strand
    );
    setStrands(updatedStrands);
    localStorage.setItem('adminStrands', JSON.stringify(updatedStrands));
  };

  const deleteStrand = (id: string) => {
    const updatedStrands = strands.filter(strand => strand.id !== id);
    setStrands(updatedStrands);
    localStorage.setItem('adminStrands', JSON.stringify(updatedStrands));
    toast.success('Strand deleted successfully');
  };

  // Course management functions
  const addCourse = () => {
    const newCourse: Course = {
      id: `COURSE_${Date.now()}`,
      name: '',
      sections: [],
      subjects: []
    };
    const updatedCourses = [...courses, newCourse];
    setCourses(updatedCourses);
    localStorage.setItem('adminCourses', JSON.stringify(updatedCourses));
    setEditingCourse(newCourse.id);
  };

  const updateCourse = (id: string, field: keyof Course, value: any) => {
    const updatedCourses = courses.map(course => 
      course.id === id ? { ...course, [field]: value } : course
    );
    setCourses(updatedCourses);
    localStorage.setItem('adminCourses', JSON.stringify(updatedCourses));
  };

  const deleteCourse = (id: string) => {
    const updatedCourses = courses.filter(course => course.id !== id);
    setCourses(updatedCourses);
    localStorage.setItem('adminCourses', JSON.stringify(updatedCourses));
    toast.success('Course deleted successfully');
  };

  // Question management functions
  const addQuestion = () => {
    const newQuestion: Question = {
      id: `Q_${Date.now()}`,
      text: '',
      category: 'Overall'
    };
    const updatedQuestions = [...questions, newQuestion];
    setQuestions(updatedQuestions);
    localStorage.setItem('adminQuestions', JSON.stringify(updatedQuestions));
    setEditingQuestion(newQuestion.id);
  };

  const updateQuestion = (id: string, field: keyof Question, value: string) => {
    const updatedQuestions = questions.map(question => 
      question.id === id ? { ...question, [field]: value } : question
    );
    setQuestions(updatedQuestions);
    localStorage.setItem('adminQuestions', JSON.stringify(updatedQuestions));
  };

  const deleteQuestion = (id: string) => {
    const updatedQuestions = questions.filter(question => question.id !== id);
    setQuestions(updatedQuestions);
    localStorage.setItem('adminQuestions', JSON.stringify(updatedQuestions));
    toast.success('Question deleted successfully');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">System Management</h1>
      
      <Tabs defaultValue="strands" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="strands">SHS Strands</TabsTrigger>
          <TabsTrigger value="courses">College Courses</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          
        </TabsList>

        <TabsContent value="strands">
          <Card>
            <CardHeader>
              <CardTitle>Manage SHS Strands</CardTitle>
              <CardDescription>Add, edit, or remove strands and their sections/subjects</CardDescription>
              <Button onClick={addStrand} className="w-fit">
                <Plus className="h-4 w-4 mr-2" />
                Add Strand
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {strands.map((strand) => (
                  <Card key={strand.id} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Strand Name</Label>
                        {editingStrand === strand.id ? (
                          <Input
                            value={strand.name}
                            onChange={(e) => updateStrand(strand.id, 'name', e.target.value)}
                            placeholder="Strand name"
                          />
                        ) : (
                          <p className="font-medium">{strand.name}</p>
                        )}
                      </div>
                      <div>
                        <Label>Sections (comma separated)</Label>
                        {editingStrand === strand.id ? (
                          <Input
                            value={strand.sections.join(', ')}
                            onChange={(e) => updateStrand(strand.id, 'sections', e.target.value.split(',').map(s => s.trim()))}
                            placeholder="9-1, 9-2, 8-1"
                          />
                        ) : (
                          <p>{strand.sections.join(', ')}</p>
                        )}
                      </div>
                      <div>
                        <Label>Subjects (comma separated)</Label>
                        {editingStrand === strand.id ? (
                          <Textarea
                            value={strand.subjects.join(', ')}
                            onChange={(e) => updateStrand(strand.id, 'subjects', e.target.value.split(',').map(s => s.trim()))}
                            placeholder="Subject 1, Subject 2, Subject 3"
                            rows={2}
                          />
                        ) : (
                          <p>{strand.subjects.join(', ')}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      {editingStrand === strand.id ? (
                        <>
                          <Button size="sm" onClick={() => setEditingStrand(null)}>
                            <Save className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setEditingStrand(null)}>
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setEditingStrand(strand.id)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => deleteStrand(strand.id)} className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses">
          <Card>
            <CardHeader>
              <CardTitle>Manage College Courses</CardTitle>
              <CardDescription>Add, edit, or remove courses and their sections/subjects</CardDescription>
              <Button onClick={addCourse} className="w-fit">
                <Plus className="h-4 w-4 mr-2" />
                Add Course
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {courses.map((course) => (
                  <Card key={course.id} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Course Name</Label>
                        {editingCourse === course.id ? (
                          <Input
                            value={course.name}
                            onChange={(e) => updateCourse(course.id, 'name', e.target.value)}
                            placeholder="Course name"
                          />
                        ) : (
                          <p className="font-medium">{course.name}</p>
                        )}
                      </div>
                      <div>
                        <Label>Sections (comma separated)</Label>
                        {editingCourse === course.id ? (
                          <Input
                            value={course.sections.join(', ')}
                            onChange={(e) => updateCourse(course.id, 'sections', e.target.value.split(',').map(s => s.trim()))}
                            placeholder="1-1, 2-1, 3-1"
                          />
                        ) : (
                          <p>{course.sections.join(', ')}</p>
                        )}
                      </div>
                      <div>
                        <Label>Subjects (comma separated)</Label>
                        {editingCourse === course.id ? (
                          <Textarea
                            value={course.subjects.join(', ')}
                            onChange={(e) => updateCourse(course.id, 'subjects', e.target.value.split(',').map(s => s.trim()))}
                            placeholder="Subject 1, Subject 2, Subject 3"
                            rows={2}
                          />
                        ) : (
                          <p>{course.subjects.join(', ')}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      {editingCourse === course.id ? (
                        <>
                          <Button size="sm" onClick={() => setEditingCourse(null)}>
                            <Save className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setEditingCourse(null)}>
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setEditingCourse(course.id)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => deleteCourse(course.id)} className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions">
          <Card>
            <CardHeader>
              <CardTitle>Manage Evaluation Questions</CardTitle>
              <CardDescription>Add, edit, or remove evaluation questions</CardDescription>
              <Button onClick={addQuestion} className="w-fit">
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {questions.map((question) => (
                  <Card key={question.id} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Question Text</Label>
                        {editingQuestion === question.id ? (
                          <Textarea
                            value={question.text}
                            onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                            placeholder="Enter question text"
                            rows={2}
                          />
                        ) : (
                          <p>{question.text}</p>
                        )}
                      </div>
                      <div>
                        <Label>Category</Label>
                        {editingQuestion === question.id ? (
                          <Select
                            value={question.category}
                            onValueChange={(value) => updateQuestion(question.id, 'category', value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Communication">Communication</SelectItem>
                              {Array.from(new Set(questions.map(q => q.category))).filter(cat => cat !== "Communication").map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="font-medium">{question.category}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      {editingQuestion === question.id ? (
                        <>
                          <Button size="sm" onClick={() => setEditingQuestion(null)}>
                            <Save className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setEditingQuestion(null)}>
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setEditingQuestion(question.id)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => deleteQuestion(question.id)} className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <UserManagementTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminManagement;
