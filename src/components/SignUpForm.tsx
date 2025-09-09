import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { Check } from "lucide-react";
import useUSNValidator from "@/hooks/useUSNValidator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

// --- UPDATED: Remove year_level and semester from SHS schema ---
const shsStudentFormSchema = z.object({
  fullName: z.string().min(3, { message: "Full name must be at least 3 characters" }),
  emailPrefix: z.string().min(1, { message: "Please enter your email username" }),
  usn: z.string().min(11, { message: "USN must be exactly 11 digits" }).max(11, { message: "USN must be exactly 11 digits" }),
  strand: z.string().min(1, { message: "Please select your strand" }),
  section: z.string().min(1, { message: "Please select your section" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

const collegeStudentFormSchema = z.object({
  fullName: z.string().min(3, { message: "Full name must be at least 3 characters" }),
  emailPrefix: z.string().min(1, { message: "Please enter your email username" }),
  usn: z.string().min(11, { message: "USN must be exactly 11 digits" }).max(11, { message: "USN must be exactly 11 digits" }),
  course: z.string().min(1, { message: "Please select your course" }),
  section: z.string().min(1, { message: "Please select your section" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

const adminFormSchema = z.object({
  fullName: z.string().min(3, { message: "Full name must be at least 3 characters" }),
  emailPrefix: z.string().min(1, { message: "Please enter your email username" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

interface SignUpFormProps {
  adminOnly?: boolean;
}

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

const SignUpForm = ({ adminOnly = false }: SignUpFormProps) => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("shs");
  const [strands, setStrands] = useState<Strand[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  
  const usnValidator = useUSNValidator("", 11);
  
  // --- UPDATED: Remove year_level and semester from defaultValues ---
  const shsStudentForm = useForm<z.infer<typeof shsStudentFormSchema>>({
    resolver: zodResolver(shsStudentFormSchema),
    defaultValues: {
      fullName: "",
      emailPrefix: "",
      usn: "",
      strand: "",
      section: "",
      password: "",
      confirmPassword: ""
    }
  });
  
  const collegeStudentForm = useForm<z.infer<typeof collegeStudentFormSchema>>({
    resolver: zodResolver(collegeStudentFormSchema),
    defaultValues: {
      fullName: "",
      emailPrefix: "",
      usn: "",
      course: "",
      section: "",
      password: "",
      confirmPassword: ""
    }
  });
  
  const adminForm = useForm<z.infer<typeof adminFormSchema>>({
    resolver: zodResolver(adminFormSchema),
    defaultValues: {
      fullName: "",
      emailPrefix: "",
      password: "",
      confirmPassword: ""
    }
  });
  
  const selectedStrand = shsStudentForm.watch("strand");
  const selectedCourse = collegeStudentForm.watch("course");
  
  useEffect(() => {
    loadDynamicData();
  }, []);

  // --- FETCH COURSES AND SECTIONS FROM DATABASE ---
  useEffect(() => {
    const fetchCoursesAndSections = async () => {
      // Fetch courses
      const { data: coursesData } = await supabase.from('courses').select('id, name');
      setCourses(coursesData || []);
    };
    fetchCoursesAndSections();
  }, []);

  // Fetch sections for selected course
  const [courseSections, setCourseSections] = useState<{ id: string, name: string }[]>([]);
  useEffect(() => {
    const fetchSections = async () => {
      if (!selectedCourse) {
        setCourseSections([]);
        return;
      }
      const courseObj = courses.find(c => c.name === selectedCourse);
      if (!courseObj) {
        setCourseSections([]);
        return;
      }
      const { data: sectionsData } = await supabase
        .from('course_sections')
        .select('id, name')
        .eq('course_id', courseObj.id);
      setCourseSections((sectionsData || []).filter(s => s.name && s.name.trim() !== ""));
    };
    fetchSections();
  }, [selectedCourse, courses]);

  // --- FETCH STRANDS AND SECTIONS FROM DATABASE ---
  useEffect(() => {
    const fetchStrandsAndSections = async () => {
      // Fetch strands
      const { data: strandsData } = await supabase.from('strands').select('id, name');
      if (!strandsData) {
        setStrands([]);
        return;
      }
      // Fetch sections for each strand
      const strandsWithSections = await Promise.all(strandsData.map(async (strand: { id: string; name: string }) => {
        const { data: sectionsData } = await supabase
          .from('strand_sections')
          .select('name')
          .eq('strand_id', strand.id);
        return {
          ...strand,
          sections: (sectionsData || []).map(s => s.name),
          subjects: []
        };
      }));
      setStrands(strandsWithSections);
    };
    fetchStrandsAndSections();
  }, []);

  const loadDynamicData = () => {
    const storedStrands = localStorage.getItem('adminStrands');
    if (storedStrands) {
      setStrands(JSON.parse(storedStrands));
    }
    const storedCourses = localStorage.getItem('adminCourses');
    if (storedCourses) {
      setCourses(JSON.parse(storedCourses));
    }
  };

  const checkEmailUniqueness = async (email: string): Promise<boolean> => {
    const { data } = await supabase
      .from('profiles')
      .select('phone_number')
      .eq('phone_number', email);
    return !data || data.length === 0;
  };
  
  const checkUSNUniqueness = async (usn: string): Promise<boolean> => {
    const { data } = await supabase
      .from('profiles')
      .select('usn')
      .eq('usn', usn);
    return !data || data.length === 0;
  };
  
  // --- UPDATED: SHS sign-up logic to match College ---
  const onSubmitSHSStudent = async (values: z.infer<typeof shsStudentFormSchema>) => {
    if (!values.usn || values.usn.length !== 11) {
      toast.error("Please enter a valid USN (exactly 11 digits)");
      return;
    }
    const isUSNUnique = await checkUSNUniqueness(values.usn);
    if (!isUSNUnique) {
      toast.error("This USN is already registered. Each USN can only be used once.");
      return;
    }
    try {
      const fullEmail = `${values.emailPrefix}@gmail.com`;
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('phone_number')
        .eq('phone_number', fullEmail)
        .maybeSingle();
      if (existingUser) {
        toast.error("This email is already registered");
        return;
      }
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: fullEmail,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
            phone_number: fullEmail,
            usn: values.usn,
            password: values.password,
            role: 'student',
            strand_course: values.strand,
            section: values.section,
            level: 'shs',
            status: 'approved',
            is_approved: true
          }
        }
      });
      if (authError) {
        if (authError.message.includes('already been registered')) {
          toast.error("This email is already registered");
        } else {
          toast.error(authError.message);
        }
        return;
      }
      if (authData.user) {
        setShowConfirmation(true);
      }
    } catch (error) {
      console.error("Error during sign up:", error);
      toast.error("Something went wrong. Please try again.");
    }
  };
  
  const onSubmitCollegeStudent = async (values: z.infer<typeof collegeStudentFormSchema>) => {
    if (!values.usn || values.usn.length !== 11) {
      toast.error("Please enter a valid USN (exactly 11 digits)");
      return;
    }
    const isUSNUnique = await checkUSNUniqueness(values.usn);
    if (!isUSNUnique) {
      toast.error("This USN is already registered. Each USN can only be used once.");
      return;
    }
    try {
      const fullEmail = `${values.emailPrefix}@gmail.com`;
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('phone_number')
        .eq('phone_number', fullEmail)
        .maybeSingle();
      if (existingUser) {
        toast.error("This email is already registered");
        return;
      }
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: fullEmail,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
            phone_number: fullEmail,
            usn: values.usn,
            password: values.password,
            role: 'student',
            strand_course: values.course,
            section: values.section,
            level: 'college',
            status: 'approved',
            is_approved: true
          }
        }
      });
      if (authError) {
        if (authError.message.includes('already been registered')) {
          toast.error("This email is already registered");
        } else {
          toast.error(authError.message);
        }
        return;
      }
      if (authData.user) {
        setShowConfirmation(true);
      }
    } catch (error) {
      console.error("Error during sign up:", error);
      toast.error("Something went wrong. Please try again.");
    }
  };

  const updateSectionSignUps = (strandCourse: string, section: string) => {
    const sectionKey = `${strandCourse} ${section}`;
    const sectionData = JSON.parse(localStorage.getItem('sectionData') || '{}');
    if (!sectionData[sectionKey]) {
      sectionData[sectionKey] = {
        name: sectionKey,
        totalCapacity: 40,
        signUps: 1,
        evaluationsCompleted: 0,
      };
    } else {
      sectionData[sectionKey].signUps = (sectionData[sectionKey].signUps || 0) + 1;
    }
    localStorage.setItem('sectionData', JSON.stringify(sectionData));
  };

  const onSubmitAdmin = async (values: z.infer<typeof adminFormSchema>) => {
    toast.error("Admin registration has been disabled");
    return;
  };
  
  if (showConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto shadow-lg">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-center text-xl">Registration Successful!</CardTitle>
            <CardDescription className="text-center">
              Your account has been created. You can now log in and evaluate teachers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <Button onClick={() => navigate("/")} className="mt-4">
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (adminOnly) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto shadow-lg">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="aclc-logo">
                <img src="/lovable-uploads/c2ca72cb-3ab3-423b-95e0-80def32b3505.png" alt="ACLC Logo" className="w-24 h-24 object-contain" />
              </div>
            </div>
            <CardTitle className="text-center">Create Admin Account</CardTitle>
            <CardDescription className="text-center">
              Create a new administrator account for the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...adminForm}>
              <form onSubmit={adminForm.handleSubmit(onSubmitAdmin)} className="space-y-4">
                <FormField
                  control={adminForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Juan Dela Cruz" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={adminForm.control}
                  name="emailPrefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="flex items-center border rounded-md">
                          <Input 
                            placeholder="username" 
                            {...field} 
                            className="border-none focus-visible:ring-0 flex-1"
                          />
                          <span className="px-3 text-muted-foreground bg-muted">@gmail.com</span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={adminForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"}
                            {...field} 
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={adminForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"}
                            {...field} 
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-4">
                  <Button type="submit" className="w-full">Create Admin Account</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // --- UPDATED: Remove year_level and semester fields to SHS form ---
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="aclc-logo">
              <img src="/lovable-uploads/logo.png" alt="ACLC Logo" className="w-24 h-24 object-contain" />
            </div>
          </div>
          <CardTitle className="text-center">Create Your Account</CardTitle>
          <CardDescription className="text-center">
            Enter your details to register as a student
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={activeTab} value={activeTab} onValueChange={(value) => setActiveTab(value)}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="shs">Senior High School</TabsTrigger>
              <TabsTrigger value="college">College</TabsTrigger>
            </TabsList>
            
            {/* Senior High School Form */}
            <TabsContent value="shs">
              <Form {...shsStudentForm}>
                <form onSubmit={shsStudentForm.handleSubmit(onSubmitSHSStudent)} className="space-y-4">
                  <FormField
                    control={shsStudentForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Juan Dela Cruz" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormItem>
                    <FormLabel>USN (Universal Student Number)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., S12345678901" 
                        {...shsStudentForm.register("usn", {
                          required: true,
                          minLength: 11,
                          maxLength: 11,
                          pattern: /^[0-9]{11}$/
                        })}
                        maxLength={11}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        onChange={e => {
                          // Only allow numbers, max 11
                          const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                          shsStudentForm.setValue("usn", value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      USN must be exactly 11 digits only
                    </FormDescription>
                    <FormMessage />
                  </FormItem>

                  <FormField
                    control={shsStudentForm.control}
                    name="emailPrefix"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="flex items-center border rounded-md">
                            <Input 
                              placeholder="username" 
                              {...field} 
                              className="border-none focus-visible:ring-0 flex-1"
                            />
                            <span className="px-3 text-muted-foreground bg-muted">@gmail.com</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={shsStudentForm.control}
                      name="strand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Strand</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select strand" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {strands.map((strand) => (
                                <SelectItem key={strand.id} value={strand.name}>
                                  {strand.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={shsStudentForm.control}
                      name="section"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Section</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            disabled={!selectedStrand}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select section" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {selectedStrand && Array.from(new Set(strands.find(s => s.name === selectedStrand)?.sections.filter(section => typeof section === 'string' && section.trim().length > 0))).map((section) => (
                                <SelectItem key={section} value={section}>{section}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={shsStudentForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showPassword ? "text" : "password"}
                              {...field} 
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 transform -translate-y-1/2"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={shsStudentForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showPassword ? "text" : "password"}
                              {...field} 
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 transform -translate-y-1/2"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-4">
                    <Button type="submit" className="w-full">Create Account</Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
            
            {/* College Form */}
            <TabsContent value="college">
              <Form {...collegeStudentForm}>
                <form onSubmit={collegeStudentForm.handleSubmit(onSubmitCollegeStudent)} className="space-y-4">
                  <FormField
                    control={collegeStudentForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Juan Dela Cruz" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={collegeStudentForm.control}
                    name="usn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>USN (Universal Student Number)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., S12345678901" 
                            {...field}
                            maxLength={11}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            onChange={e => {
                              // Only allow numbers, max 11
                              const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          USN must be exactly 11 digits only
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={collegeStudentForm.control}
                    name="emailPrefix"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="flex items-center border rounded-md">
                            <Input 
                              placeholder="username" 
                              {...field} 
                              className="border-none focus-visible:ring-0 flex-1"
                            />
                            <span className="px-3 text-muted-foreground bg-muted">@gmail.com</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={collegeStudentForm.control}
                      name="course"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Course</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select course" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {courses.filter(course => course.name && course.name.trim() !== "").map((course) => (
                                <SelectItem key={course.id} value={course.name}>
                                  {course.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={collegeStudentForm.control}
                      name="section"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Section</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            disabled={!selectedCourse}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select section" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {selectedCourse && courseSections.map((section) => (
                                <SelectItem key={section.id} value={section.name}>{section.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={collegeStudentForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showPassword ? "text" : "password"}
                              {...field} 
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 transform -translate-y-1/2"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={collegeStudentForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showPassword ? "text" : "password"}
                              {...field} 
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 transform -translate-y-1/2"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-4">
                    <Button type="submit" className="w-full">Create Account</Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
          
          <div className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <a href="/" className="text-primary hover:underline">
              Sign in
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignUpForm;

