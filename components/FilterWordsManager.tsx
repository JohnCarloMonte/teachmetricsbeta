import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const FilterWordsManager = () => {
  const [filteredWords, setFilteredWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState("");
  const [showHiddenComments, setShowHiddenComments] = useState(false);
  const [hiddenComments, setHiddenComments] = useState<{ teacher: string; positive: string; improvement: string }[]>([]);

  useEffect(() => {
    const fetchWords = async () => {
      const { data, error } = await supabase.from("filter_words").select("word");
      if (!error) {
        setFilteredWords((data || []).map((w: { word: string }) => w.word));
      }
    };
    fetchWords();
  }, []);

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) {
      toast.error("Please enter a keyword");
      return;
    }
    const word = newWord.toLowerCase().trim();
    if (filteredWords.includes(word)) {
      toast.error("This keyword is already in the list");
      return;
    }
    const { error } = await supabase.from("filter_words").insert([{ word }]);
    if (!error) {
      setFilteredWords(prev => [...prev, word]);
      setNewWord("");
      toast.success(`Added "${word}" to keyword list`);
    } else {
      toast.error("Failed to add keyword");
    }
  };

  const handleRemoveWord = async (wordToRemove: string) => {
    const { error } = await supabase.from("filter_words").delete().eq("word", wordToRemove);
    if (!error) {
      setFilteredWords(prev => prev.filter(word => word !== wordToRemove));
      toast.success(`Removed "${wordToRemove}" from keyword list`);
    } else {
      toast.error("Failed to remove keyword");
    }
  };

  const handleShowHiddenComments = async () => {
    setShowHiddenComments(prev => !prev);
    if (!showHiddenComments) {
      // Fetch all comments from evaluations table
      const { data, error } = await supabase.from("evaluation1").select("teacher_name, positive_feedback, suggestions");
      if (!error && data) {
        // Filter comments containing any filter word
        const filtered = data.filter((row: any) => {
          const allText = `${row.positive_feedback || ''} ${row.suggestions || ''}`.toLowerCase();
          return filteredWords.some(word => allText.includes(word.toLowerCase()));
        }).map((row: any) => ({
          teacher: row.teacher_name,
          positive: row.positive_feedback,
          improvement: row.suggestions
        }));
        setHiddenComments(filtered);
      }
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Keywords Manager</h1>
      <p className="text-muted-foreground">
        Add positive and negative keywords to help automatically categorize student feedback as positive or negative.
      </p>
      
      <Card>
        <CardHeader>
          <CardTitle>Add New Keyword</CardTitle>
          <CardDescription>Add positive and negative words to help categorize student feedback</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddWord} className="flex space-x-2">
            <div className="flex-1">
              <Input 
                placeholder="Enter positive or negative keyword..." 
                value={newWord} 
                onChange={(e) => setNewWord(e.target.value)}
              />
            </div>
            <Button type="submit">Add Keyword</Button>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Current Keywords</CardTitle>
          <CardDescription>Keywords used for categorizing feedback sentiment</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filter Word</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWords.length > 0 ? (
                filteredWords.map((word) => (
                  <TableRow key={word}>
                    <TableCell className="font-medium">{word}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleRemoveWord(word)}
                        className="h-8 w-8 p-0 text-red-500"
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-center">No keywords added yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Button
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={handleShowHiddenComments}
      >
        {showHiddenComments ? "Hide Hidden Comments" : "Show Hidden Comments"}
      </Button>
      {showHiddenComments && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Hidden Comments</CardTitle>
            <CardDescription>Comments containing filtered words</CardDescription>
          </CardHeader>
          <CardContent>
            {hiddenComments.length === 0 ? (
              <div className="text-center text-muted-foreground">No hidden comments found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Positive Feedback</TableHead>
                    <TableHead>Suggestions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hiddenComments.map((c, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{c.teacher}</TableCell>
                      <TableCell>{c.positive}</TableCell>
                      <TableCell>{c.improvement}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
      
    </div>
  );
};

export default FilterWordsManager;
