import React from "react";

interface SubmissionSummaryProps {
  flatQuestions: { id: string; text: string; category: string }[];
  availableTeachers: { teacher: { id: string; name: string }; }[];
  matrixRatings: { [questionId: string]: { [teacherId: string]: number } };
  teacherComments?: { [teacherId: string]: { positive: string; improvement: string } };
}

export const SubmissionSummary: React.FC<SubmissionSummaryProps> = ({ flatQuestions, availableTeachers, matrixRatings, teacherComments }) => {
  // Calculate category ratings
  const categoryScores: { [cat: string]: { score: number; max: number } } = {};
  flatQuestions.forEach(q => {
    availableTeachers.forEach(t => {
      const rating = matrixRatings[q.id]?.[t.teacher.id] || 0;
      if (!categoryScores[q.category]) categoryScores[q.category] = { score: 0, max: 0 };
      categoryScores[q.category].score += rating;
      categoryScores[q.category].max += 5;
    });
  });
  const overallScore = Object.values(categoryScores).reduce((sum, c) => sum + c.score, 0);
  const overallMax = Object.values(categoryScores).reduce((sum, c) => sum + c.max, 0);
  const overallPercent = overallMax > 0 ? Math.round((overallScore / overallMax) * 100) : 0;

  return (
    <div className="mt-6">
      
      <table className="min-w-full border mb-6">
        <thead>
          <tr>
            <th className="border px-2 py-1">Question</th>
            <th className="border px-2 py-1">Teacher</th>
            <th className="border px-2 py-1">Rating</th>
          </tr>
        </thead>
        <tbody>
          {flatQuestions.map(q => (
            availableTeachers.map(t => (
              <tr key={q.id + '-' + t.teacher.id}>
                <td className="border px-2 py-1">{q.text}</td>
                <td className="border px-2 py-1">{t.teacher.name}</td>
                <td className="border px-2 py-1 text-center">{matrixRatings[q.id]?.[t.teacher.id] || '-'}</td>
              </tr>
            ))
          ))}
        </tbody>
      </table>
     
    </div>
  );
};
