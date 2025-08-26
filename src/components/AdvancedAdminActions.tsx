import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ADMIN_PASSWORD = "admin123"; // Change this to your actual admin password logic

const AdvancedAdminActions = () => {
  const [password, setPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const handleResetEvaluations = async () => {
    if (password !== ADMIN_PASSWORD) {
      toast.error("Incorrect admin password");
      return;
    }
    setIsResetting(true);
    // Delete all data in evaluations table
    const { error } = await supabase.from("evaluations").delete().not("id", "is", null);
    setIsResetting(false);
    if (error) {
      toast.error("Failed to reset evaluations");
    } else {
      toast.success("All evaluations deleted successfully");
    }
  };

  const handleResetEvaluation = async () => {
    const { error } = await supabase.from("evaluation1").delete().neq("teacher_id", ""); // Delete all rows
    if (!error) {
      alert("All evaluation data has been deleted.");
    } else {
      alert("Failed to reset evaluation data.");
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-8">
      <Card>
        <CardHeader>
          <CardTitle>Advanced Admin Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
      
          <button
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={handleResetEvaluation}
          >
            Reset Evaluation
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedAdminActions;
