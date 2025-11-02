import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, ImageRun } from "docx";
import { saveAs } from "file-saver";

const ReportsView = () => {
  const [reportData, setReportData] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ category: string; category_name?: string }[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [teacherComments, setTeacherComments] = useState<{ positive: string; improvement: string }[]>([]);
  const [teacherFinalRating, setTeacherFinalRating] = useState<string>("");
  const [teacherName, setTeacherName] = useState<string>("");
  const [filterWords, setFilterWords] = useState<string[]>([]);

  const logoUrl = "/lovable-uploads/Picture1.png"; // Replace with your logo URL or base64

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);

      // Fetch questions and build local categories array (use locals for calculations)
      const { data: questionsData } = await supabase.from("questions").select("category, category_name, id");
      const localQuestions = questionsData || [];
      const localCategories = Array.from(
        new Map(localQuestions.map(q => [q.category, { category: q.category, category_name: q.category_name }])).values()
      );
      setQuestions(localQuestions);
      setCategories(localCategories);

      // Fetch all evaluations
      const { data: evaluations } = await supabase
        .from("evaluation1")
        .select("teacher_id, teacher_name, total_respondents, highest_possible_score, answers, overall_rating, category_ratings, positive_feedback, suggestions");

      // Group by teacher
      const teacherMap: { [id: string]: any } = {};
      (evaluations || []).forEach(ev => {
        if (!teacherMap[ev.teacher_id]) {
          teacherMap[ev.teacher_id] = {
            teacher_id: ev.teacher_id,
            teacher_name: ev.teacher_name,
            total_respondents: 0,
            answers: [],
            overall_rating: 0,
            category_ratings: {},
            comments: [],
          };
        }
        teacherMap[ev.teacher_id].total_respondents += 1;
        if (ev.answers) {
          const ansObj = typeof ev.answers === "string" ? JSON.parse(ev.answers) : ev.answers;
          teacherMap[ev.teacher_id].answers.push(ansObj);
        }
        teacherMap[ev.teacher_id].overall_rating = ev.overall_rating || teacherMap[ev.teacher_id].overall_rating;
        if (ev.category_ratings) {
          const catRatings = typeof ev.category_ratings === "string" ? JSON.parse(ev.category_ratings) : ev.category_ratings;
          Object.entries(catRatings).forEach(([cat, val]: [string, any]) => {
            if (!teacherMap[ev.teacher_id].category_ratings[cat]) teacherMap[ev.teacher_id].category_ratings[cat] = { score: 0, max: 0 };
            teacherMap[ev.teacher_id].category_ratings[cat].score += Number(val.score) || 0;
            teacherMap[ev.teacher_id].category_ratings[cat].max += Number(val.max) || 0;
          });
        }
        teacherMap[ev.teacher_id].comments.push({
          positive: ev.positive_feedback,
          improvement: ev.suggestions,
        });
      });

      // Compute accumulated_score and overall_rating using localQuestions/localCategories
      Object.values(teacherMap).forEach((teacher: any) => {
        teacher.accumulated_score = localCategories.reduce((sum, cat) => {
          const catData = teacher.category_ratings[cat.category];
          return sum + (catData && typeof catData.score === 'number' ? catData.score : 0);
        }, 0);
        const numQuestions = localQuestions.length;
        teacher.highest_possible_score = numQuestions * teacher.total_respondents * 5;
        teacher.overall_rating = teacher.highest_possible_score > 0
          ? ((teacher.accumulated_score / teacher.highest_possible_score) * 100).toFixed(2)
          : "0.00";
      });

      setReportData(Object.values(teacherMap));
      setLoading(false);
    };

    fetchReport();
  }, []);

  useEffect(() => {
    const fetchFilterWords = async () => {
      const { data } = await supabase.from("filter_words").select("word");
      setFilterWords((data || []).map((w: { word: string }) => w.word));
    };
    fetchFilterWords();
  }, []);

  const handleExportExcel = () => {
    // Prepare data for export
    const header = [
      "Teacher",
      "Respondents",
      "Highest Possible Score",
      "Accumulated Score",
      "Overall Rating",
      ...categories.map(cat => cat.category_name || cat.category ),
    ];
    const rows = reportData.map(teacher => {
      const numQuestions = questions.length;
      const highestPossibleScore = numQuestions * teacher.total_respondents * 5;
      const categoryPercents = categories.map(cat => {
        const catData = teacher.category_ratings[cat.category];
        return catData && catData.max > 0 ? Math.round(catData.score) : 0;
      });
      return [
        teacher.teacher_name,
        teacher.total_respondents,
        highestPossibleScore,
        teacher.accumulated_score,
        teacher.overall_rating + "%",
        ...categoryPercents,
      ];
    });
    const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);

    // Auto-size columns
    worksheet['!cols'] = header.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...rows.map(row => (row[i] ? row[i].toString().length : 0))
      );
      return { wch: Math.max(16, maxLen + 2) }; // Minimum 16, auto-size
    });

    // Style all cells: font size, borders, center alignment
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cell_address]) continue;
        worksheet[cell_address].s = {
          font: { sz: 16 },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" }
          }
        };
      }
    }

    // Center the sheet horizontally (print setup)
    worksheet['!pageSetup'] = { orientation: "landscape", fitToWidth: 1, fitToHeight: 0, horizontalCentered: true };

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, "evaluation_report.xlsx");
  };

  const handleExportTBIScoreWord = async () => {
    const header = [
      "No.",
      "Teacher Name",
      "Position",
      "Total Respondents",
      "Highest Possible Score",
      "Total Accumulated Score",
      "Final Rating"
    ];
    const rows = reportData.map((teacher, idx) => {
      const numQuestions = questions.length;
      const highestPossibleScore = numQuestions * teacher.total_respondents * 5;
      const nameNormalized = teacher.teacher_name ? teacher.teacher_name.trim().toLowerCase() : "";
      const position = nameNormalized === "dr. gerry lopez" ? "Part Time Instructor" : "Assistant Instructor 1";
      return [
        (idx + 1).toString(),
        teacher.teacher_name,
        position,
        teacher.total_respondents.toString(),
        highestPossibleScore.toString(),
        teacher.accumulated_score.toString(),
        teacher.overall_rating + "%"
      ];
    });
    // Build table rows for docx
    const tableRows = [
      new TableRow({
        children: header.map(cell =>
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: cell, bold: true, color: "FFFFFF" })],
              alignment: "center"
            })],
            shading: { fill: "4682B4" }, // Steel blue
          })
        ),
      }),
      ...rows.map(row =>
        new TableRow({
          children: row.map((cell, idx) =>
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: cell, bold: idx === 6 })],
                alignment: "center"
              })],
            })
          ),
        })
      )
    ];
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [new TextRun({ text: "TBI SCORE REPORT", bold: true, size: 32 })],
              alignment: "center"
            }),
            new Table({ rows: tableRows }),
            new Paragraph({ text: "" }),
            
          ],
        },
      ],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, "TBI_SCORE.docx");
  }; 

  const handleTeacherChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const teacherId = e.target.value;
    setSelectedTeacher(teacherId); 
    if (!teacherId) return;
    // Fetch comments for selected teacher
    const { data: evaluations } = await supabase
      .from("evaluation1")
      .select("positive_feedback, suggestions, teacher_name")
      .eq("teacher_id", teacherId);
    setTeacherComments(
      (evaluations || []).map(ev => ({
        positive: ev.positive_feedback || "",
        improvement: ev.suggestions || ""
      }))
    );
    setTeacherName(evaluations && evaluations[0] ? evaluations[0].teacher_name : "");
    // Always use the computed overall rating from reportData for export
    const teacherRow = reportData.find(t => t.teacher_id === teacherId);
    setTeacherFinalRating(teacherRow ? teacherRow.overall_rating + "%" : "");
  };

  const handleExportCommentsWord = async () => {
    // Fetch logo as base64
    let logoBase64 = "";
    try {
      const response = await fetch(logoUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      logoBase64 = await new Promise<string>(resolve => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (err) {}
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    // Filter out comments containing any filter word
    const filteredComments = teacherComments.filter(c => {
      const allText = `${c.positive} ${c.improvement}`.toLowerCase();
      return !filterWords.some(word => allText.includes(word.toLowerCase()));
    });
    // Build comments table
    const tableRows = [
      new TableRow({
        children: [
          new TableCell({ 
            children: [new Paragraph({ children: [new TextRun({ text: "Positive Feedback", bold: true })], alignment: "center" })],
            margins: { top: 200, bottom: 200, left: 400, right: 400 } // add padding
          }),
          new TableCell({ 
            children: [new Paragraph({ children: [new TextRun({ text: "Areas for Improvement", bold: true })], alignment: "center" })],
            margins: { top: 200, bottom: 200, left: 400, right: 400 } // add padding
          })
        ]
      }),
      ...filteredComments.map(c =>
        new TableRow({
          children: [
            new TableCell({ 
              children: [new Paragraph({ children: [new TextRun({ text: c.positive })], alignment: "center" })],
              margins: { top: 200, bottom: 200, left: 400, right: 400 } // add padding
            }),
            new TableCell({ 
              children: [new Paragraph({ children: [new TextRun({ text: c.improvement })], alignment: "center" })],
              margins: { top: 200, bottom: 200, left: 400, right: 400 } // add padding
            })
          ]
        })
      )
    ];
    // Prepare logo image if available
    let logoImageRun = null;
    if (logoBase64) {
      const base64Data = logoBase64.split(",")[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      logoImageRun = new Paragraph({
        children: [
          new ImageRun({ data: byteArray, transformation: { width: 210, height: 80 } }) // changed from 97x56 to 210x80
        ],
        alignment: "center"
      });
    }
    const doc = new Document({
      sections: [
        {
          children: [
            logoImageRun || new Paragraph({}),
            new Paragraph({ children: [new TextRun({ text: "A Member of AMA Education System", size: 22 })], alignment: "center" }),
            new Paragraph({ children: [new TextRun({ text: "2nd flr. Guinhawa Bldg., J. Lukban St., Daet, Camarines Norte", bold: false, size: 22 })], alignment: "center" }),            
                           new Paragraph({ text: "" }),
                  new Paragraph({ text: "" }),
            new Paragraph({ children: [new TextRun({ text: "OFFICE OF THE ACADEMIC HEAD", bold: true, size: 28 })], alignment: "center" }),
               new Paragraph({ text: "" }),
              new Paragraph({ text: "" }),
            new Paragraph({ children: [new TextRun({ text: "TEACHERS' BEHAVIOR INVENTORY", bold: true, color: "FF0000", size: 28 })], alignment: "center" }),
            new Paragraph({ children: [new TextRun({ text: "(FEEDBACK AND COMMENTS)", bold: true, size: 24 })], alignment: "center" }),
           new Paragraph({ children: [new TextRun({ text: "1st Semester A/Y 2025-2026", bold: true, size: 24})], alignment: "center" }),



            new Paragraph({ text: "" }),
                  new Paragraph({ text: "" }),
             new Paragraph({ children: [new TextRun({ text: `NAME OF FACULTY: ${teacherName}`, size: 24 })], alignment: "left" }),
                          new Paragraph({ children: [new TextRun({ text: `POSITION: ASSISTANT INSTRUCTOR 1`, size: 24 })], alignment: "left" }),
            new Paragraph({ children: [new TextRun({ text: `RATING: ${teacherFinalRating}` })], alignment: "left" }),
             new Paragraph({ text: "" }),
                new Paragraph({ text: "" }),
                   new Paragraph({ text: "" }),
            new Paragraph({ children: [new TextRun({ text: "STUDENTS' COMMENTS AND FEEDBACK", bold: true, size: 24 })], alignment: "center" }),
               new Paragraph({ text: "" }),
                  new Paragraph({ text: "" }),
           
            new Table({ rows: tableRows, width: { size: 100, type: "pct" } }),
            new Paragraph({ text: "" }),
               new Paragraph({ text: "" }),
                  new Paragraph({ text: "" }),
                     new Paragraph({ text: "" }),
           
            // Signature section (Word export)
            new Table({
              rows: [
                // Row 1: Headers
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: "Prepared and verified by:", size: 22 })],
                          alignment: "left"
                        }),
                      ],
                      borders: {},
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: "Noted by:", size: 22 })],
                          alignment: "left"
                        }),
                      ],
                      borders: {},
                    }),
                  ]
                }),
                       new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({})], borders: {} }),
                    new TableCell({ children: [new Paragraph({})], borders: {} }),
                  ]
                }),
                // Empty row
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({})], borders: {} }),
                    new TableCell({ children: [new Paragraph({})], borders: {} }),
                  ]
                }),
                // Row 2: Names and positions
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "JEROME L. SAMANTE, LPT.", bold: true, underline: {}, size: 22 }),
                          ],
                          alignment: "left"
                        }),
                        new Paragraph({
                          children: [new TextRun({ text: "Academic Head", size: 20 })],
                          alignment: "left"
                        }),
                      ],
                      borders: {},
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "MARIEL F. BUGAGAO", bold: true, underline: {}, size: 22 }),
                          ],
                          alignment: "center"
                        }),
                        new Paragraph({
                          children: [new TextRun({ text: "School Director", size: 20 })],
                          alignment: "center"
                        }),
                      ],
                      borders: {},
                    }),
                  ]
                }),
                // Empty row
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({})], borders: {} }),
                    new TableCell({ children: [new Paragraph({})], borders: {} }),
                  ]
                }),
                // Row 3: Received by
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: "Received by:", size: 22 })],
                          alignment: "left"
                        }),
                        new Paragraph({}),
                        new Paragraph({
                          children: [new TextRun({ text: "_________________________", underline: {}, size: 22 })],
                          alignment: "left"
                        }),
                        new Paragraph({
                          children: [new TextRun({ text: "Name and Signature of Faculty", size: 18 })],
                          alignment: "left"
                        }),
                        new Paragraph({
                          children: [new TextRun({ text: "Date:", size: 18 })],
                          alignment: "left"
                        }),
                      ],
                      borders: {},
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({}),
                        new Paragraph({}),
                        new Paragraph({}),
                        new Paragraph({}),
                      ],
                      borders: {},
                    }),
                  ]
                }),
                // Empty row
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({})], borders: {} }),
                    new TableCell({ children: [new Paragraph({})], borders: {} }),
                  ]
                }),
              ],
              width: { size: 100, type: "pct" },
              borders: {
                top: { style: "none" },
                bottom: { style: "none" },
                left: { style: "none" },
                right: { style: "none" },
                insideHorizontal: { style: "none" },
                insideVertical: { style: "none" }
              }
            }),
          ]
        }
      ]
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${teacherName}_comments.docx`);
  };

  if (loading) {
    return <div className="p-8 text-center">Loading report...</div>;
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Evaluation Report</h2>

      <button
        className="mb-4 ml-2 px-4 py-2 bg-indigo-700 text-white rounded hover:bg-indigo-800"
        onClick={handleExportTBIScoreWord}
      >
        Export TBI SCORE
      </button>

      <div className="mb-4 flex gap-2 items-center">
        <select
          className="px-2 py-1 border rounded"
          value={selectedTeacher}
          onChange={handleTeacherChange}
        >
          <option value="">Select Teacher</option>
          {reportData.map(t => (
            <option key={t.teacher_id} value={t.teacher_id}>{t.teacher_name}</option>
          ))}
        </select>
        <button
          className="px-4 py-2 bg-purple-700 text-white rounded hover:bg-purple-800"
          onClick={handleExportCommentsWord}
          disabled={!selectedTeacher}
        >
          Export Comments
        </button>
      </div>

      {reportData.length === 0 ? (
        <div>No evaluation data found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2">Teacher</th>
                <th className="border px-4 py-2">Respondents</th>
                <th className="border px-4 py-2">Highest Possible Score</th>
                <th className="border px-4 py-2">Accumulated Score</th>
                <th className="border px-4 py-2">Overall Rating</th>
                {categories.map(cat => (
                  <th key={cat.category} className="border px-4 py-2">{cat.category_name || cat.category}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportData.map(teacher => {
                const numQuestions = questions.length;
                const highestPossibleScore = numQuestions * teacher.total_respondents * 5;
                return (
                  <tr key={teacher.teacher_id}>
                    <td className="border px-4 py-2 font-bold">{teacher.teacher_name}</td>
                    <td className="border px-4 py-2 text-center">{teacher.total_respondents}</td>
                    <td className="border px-4 py-2 text-center">{highestPossibleScore}</td>
                    <td className="border px-4 py-2 text-center">{teacher.accumulated_score}</td>
                    <td className="border px-4 py-2 text-center">{teacher.overall_rating}%</td>
                    {categories.map(cat => {
                      const catData = teacher.category_ratings[cat.category];
                      const sum = catData ? Math.round(catData.score) : 0;
                      return (
                        <td key={cat.category} className="border px-4 py-2 text-center">{sum}</td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ReportsView;
