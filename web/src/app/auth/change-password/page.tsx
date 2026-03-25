"use client";

import React, { useState } from "react";
import AuthFlowContainer from "@/components/auth/AuthFlowContainer";
import Title from "@/components/ui/title";
import Text from "@/components/ui/text";
import { Button } from "@opal/components";
import { Disabled } from "@opal/core";
import { Form, Formik } from "formik";
import * as Yup from "yup";
import { TextFormField } from "@/components/Field";
import { toast } from "@/hooks/useToast";
import { Spinner } from "@/components/Spinner";

const ChangePasswordPage: React.FC = () => {
  const [isWorking, setIsWorking] = useState(false);

  return (
    <AuthFlowContainer>
      <div className="flex flex-col w-full justify-center">
        <div className="flex">
          <Title className="mb-2 mx-auto font-bold">Change Password</Title>
        </div>
        <Text className="mb-4 text-center">
          You must change your password before continuing.
        </Text>
        {isWorking && <Spinner />}
        <Formik
          initialValues={{
            oldPassword: "",
            newPassword: "",
            confirmPassword: "",
          }}
          validationSchema={Yup.object().shape({
            oldPassword: Yup.string().required("Current password is required"),
            newPassword: Yup.string()
              .min(1, "New password is required")
              .notOneOf(
                [Yup.ref("oldPassword")],
                "New password must be different from current password"
              )
              .required("New password is required"),
            confirmPassword: Yup.string()
              .oneOf(
                [Yup.ref("newPassword"), undefined],
                "Passwords must match"
              )
              .required("Please confirm your new password"),
          })}
          onSubmit={async (values) => {
            setIsWorking(true);
            try {
              const response = await fetch("/api/password/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  old_password: values.oldPassword,
                  new_password: values.newPassword,
                }),
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                  errorData.detail || "Failed to change password"
                );
              }

              toast.success(
                "Password changed successfully. Redirecting..."
              );
              setTimeout(() => {
                window.location.href = "/app";
              }, 1000);
            } catch (error) {
              if (error instanceof Error) {
                toast.error(error.message);
              } else {
                toast.error("An unexpected error occurred. Please try again.");
              }
            } finally {
              setIsWorking(false);
            }
          }}
        >
          {({ isSubmitting }) => (
            <Form className="w-full flex flex-col items-stretch mt-2">
              <TextFormField
                name="oldPassword"
                label="Current Password"
                type="password"
                placeholder="Enter your current password"
              />
              <TextFormField
                name="newPassword"
                label="New Password"
                type="password"
                placeholder="Enter your new password"
              />
              <TextFormField
                name="confirmPassword"
                label="Confirm New Password"
                type="password"
                placeholder="Confirm your new password"
              />

              <div className="flex">
                <Disabled disabled={isSubmitting}>
                  <Button type="submit" width="full">
                    Change Password
                  </Button>
                </Disabled>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </AuthFlowContainer>
  );
};

export default ChangePasswordPage;
