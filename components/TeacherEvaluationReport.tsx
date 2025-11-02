import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';

interface TeacherEvaluationReportProps {
  teacherResult: {
    teacher_id: string;
    overall_rating: number;
    total_evaluations: number;
    average_scores: {
      teaching_effectiveness: number;
      classroom_management: number;
      course_content: number;
      responsiveness: number;
    };
    positive_comments: string[];
    negative_comments: string[];
    suggestions: string[];
    flagged_comments: string[];
    overall_rank?: number;
    category_ranks?: {
      teaching_effectiveness_rank: number;
      classroom_management_rank: number;
      course_content_rank: number;
      responsiveness_rank: number;
    };
    teachers?: { name: string };
  };
  evaluationPeriod: string;
}

export const TeacherEvaluationReport: React.FC<TeacherEvaluationReportProps> = ({
  teacherResult,
  evaluationPeriod
}) => {
  const handlePrint = () => {
    window.print();
  };

  const getPerformanceLevel = (score: number) => {
    if (score >= 90) return { level: 'Excellent', color: 'bg-green-100 text-green-800' };
    if (score >= 80) return { level: 'Very Good', color: 'bg-blue-100 text-blue-800' };
    if (score >= 70) return { level: 'Good', color: 'bg-yellow-100 text-yellow-800' };
    if (score >= 60) return { level: 'Fair', color: 'bg-orange-100 text-orange-800' };
    return { level: 'Needs Improvement', color: 'bg-red-100 text-red-800' };
  };

  const teacherName = teacherResult.teachers?.name || 'Unknown Teacher';
  const overallPerformance = getPerformanceLevel(teacherResult.overall_rating);

  return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Print Reports</h2>
            <p className="text-muted-foreground">Generate printable evaluation reports</p>
          </div>
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print All Reports
          </Button>
        </div>

      <div ref={printRef} className="space-y-8 print:p-8">
        {/* Print Header */}
        <div className="text-center border-b pb-4">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img 
              src="/lovable-uploads/16679378-5052-48ed-ac5a-be364abdd6c9.png" 
              alt="ACLC Logo" 
              className="h-16 w-16 object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold">ACLC - Teacher Evaluation Results</h1>
              <p className="text-gray-600">Academic Year 2024-2025</p>
            </div>
          </div>
        </div>

        {/* Overall Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Total Evaluations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{evaluations.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Evaluated Teachers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {new Set(evaluations.map(e => e.teacher_id)).size}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                Average Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {evaluations.length > 0 
                  ? (evaluations.reduce((sum, e) => sum + e.overall_rating, 0) / evaluations.length).toFixed(1)
                  : '0.0'
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Teacher-wise Reports */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Individual Teacher Reports</h2>
          
          {teachers.map((teacher) => {
            const stats = calculateTeacherStats(teacher.id);
            if (!stats) return null;

            return (
              <Card key={teacher.id} className="page-break-inside-avoid">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{teacher.name}</CardTitle>
                      <p className="text-muted-foreground">{teacher.department}</p>
                    </div>
                    <Badge variant={parseFloat(stats.averageRating) >= 4 ? 'default' : 'secondary'}>
                      {stats.averageRating}/5.0
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium">Total Evaluations</p>
                      <p className="text-2xl font-bold">{stats.totalEvaluations}</p>
                    </div>
                    <div>
                      <p className="font-medium">Average Rating</p>
                      <p className="text-2xl font-bold">{stats.averageRating}/5.0</p>
                    </div>
                  </div>

                  {stats.positiveComments.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Good Qualitiess</h4>
                      <div className="space-y-1">
                        {stats.positiveComments.slice(0, 5).map((comment, index) => (
                          <p key={index} className="text-sm text-gray-600">• {comment}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {stats.suggestions.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Areas for Improvement</h4>
                      <div className="space-y-1">
                        {stats.suggestions.slice(0, 5).map((suggestion, index) => (
                          <p key={index} className="text-sm text-gray-600">• {suggestion}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Signature Section */}
                  <div className="border-t pt-4 mt-6">
                    <div className="grid grid-cols-3 gap-8 text-center">
                      <div>
                        <div className="border-b border-gray-400 mb-2 pb-1">
                          <p className="text-sm font-medium">{teacher.name}</p>
                        </div>
                        <p className="text-xs text-gray-600">Received by: (Teacher)</p>
                      </div>
                      <div>
                        <div className="border-b border-gray-400 mb-2 pb-1">
                          <p className="text-sm font-medium">Jerome Samante</p>
                        </div>
                        <p className="text-xs text-gray-600">Evaluated by: (Academic Head)</p>
                      </div>
                      <div>
                        <div className="border-b border-gray-400 mb-2 pb-1">
                          <p className="text-sm font-medium">Mariel Bhogs</p>
                        </div>
                        <p className="text-xs text-gray-600">Noted by: (School Director)</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Overall Summary */}
        <Card className="page-break-before">
          <CardHeader>
            <CardTitle>Overall Evaluation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium">Total Evaluations Submitted</p>
                  <p className="text-2xl font-bold">{evaluations.length}</p>
                </div>
                <div>
                  <p className="font-medium">Teachers Evaluated</p>
                  <p className="text-2xl font-bold">{new Set(evaluations.map(e => e.teacher_id)).size}</p>
                </div>
              </div>

              {/* All Comments */}
              <div>
                <h4 className="font-medium mb-2">All Comments</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {evaluations.map((evaluation, index) => (
                    <div key={index} className="border-l-4 border-gray-200 pl-4">
                      <p className="font-medium text-sm">{evaluation.teacher_name}</p>
                      {evaluation.positive_feedback && (
                        <p className="text-sm text-green-600">+ {evaluation.positive_feedback}</p>
                      )}
                      {evaluation.suggestions && (
                        <p className="text-sm text-blue-600">→ {evaluation.suggestions}</p>
                      )}
                      {evaluation.negative_feedback && (
                        <p className="text-sm text-red-600">- {evaluation.negative_feedback}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Final Signatures */}
              <div className="border-t pt-4 mt-6">
                <div className="grid grid-cols-2 gap-8 text-center">
                  <div>
                    <div className="border-b border-gray-400 mb-2 pb-1">
                      <p className="text-sm font-medium">Jerome Samante</p>
                    </div>
                    <p className="text-xs text-gray-600">Evaluated by: (Academic Head)</p>
                  </div>
                  <div>
                    <div className="border-b border-gray-400 mb-2 pb-1">
                      <p className="text-sm font-medium">Mariel Bhogs</p>
                    </div>
                    <p className="text-xs text-gray-600">Approved by: (School Director)</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <style>
        {`
          @media print {
            .page-break-before {
              page-break-before: always;
            }
            .page-break-inside-avoid {
              page-break-inside: avoid;
            }
          }
        `}
      </style>
    </div>
  );

};
