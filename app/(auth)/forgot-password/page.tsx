"use client";

import ForgotPasswordForm from "@/components/forgotPassword/ForgotPasswordForm";
import React, { useState } from "react";

export default function ForgotPasswordPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  console.log(isDialogOpen)
  return (
    <div>
      <h2>Forgot Password</h2>
      {/* You might want to wrap this in a Dialog or Modal component */}
      <ForgotPasswordForm setIsDialogOpen={setIsDialogOpen} />
    </div>
  );
}