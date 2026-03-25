"use client";

import { useState, useCallback } from "react";
import { Button } from "@opal/components";
import { SvgUsers, SvgAlertTriangle } from "@opal/icons";
import { Disabled } from "@opal/core";
import Modal, { BasicModalFooter } from "@/refresh-components/Modal";
import InputChipField from "@/refresh-components/inputs/InputChipField";
import type { ChipItem } from "@/refresh-components/inputs/InputChipField";
import InputTypeIn from "@/refresh-components/inputs/InputTypeIn";
import PasswordInputTypeIn from "@/refresh-components/inputs/PasswordInputTypeIn";
import Text from "@/refresh-components/texts/Text";
import { toast } from "@/hooks/useToast";
import { inviteUsers, createUserByAdmin } from "./svc";
import { NEXT_PUBLIC_USE_USERNAME_AUTH } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InviteUsersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Username Auth Create-User Form
// ---------------------------------------------------------------------------

function UsernameCreateUserForm({
  isSubmitting,
  onSubmit,
  onClose,
}: {
  isSubmitting: boolean;
  onSubmit: (username: string, password: string) => void;
  onClose: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <>
      <Modal.Body>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Text as="label" mainUiBody text03>
              Username
            </Text>
            <InputTypeIn
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              data-testid="create-user-username"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Text as="label" mainUiBody text03>
              Initial Password
            </Text>
            <PasswordInputTypeIn
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter initial password"
              data-testid="create-user-password"
            />
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <BasicModalFooter
          cancel={
            <Disabled disabled={isSubmitting}>
              <Button prominence="tertiary" onClick={onClose}>
                Cancel
              </Button>
            </Disabled>
          }
          submit={
            <Disabled
              disabled={
                isSubmitting || username.trim() === "" || password.trim() === ""
              }
            >
              <Button
                onClick={() => onSubmit(username.trim(), password)}
              >
                Create User
              </Button>
            </Disabled>
          }
        />
      </Modal.Footer>
    </>
  );
}

// ---------------------------------------------------------------------------
// Email Invite Form (original)
// ---------------------------------------------------------------------------

function EmailInviteForm({
  isSubmitting,
  onSubmit,
  onClose,
}: {
  isSubmitting: boolean;
  onSubmit: (emails: string[]) => void;
  onClose: () => void;
}) {
  const [chips, setChips] = useState<ChipItem[]>([]);
  const [inputValue, setInputValue] = useState("");

  function parseEmails(value: string, existing: ChipItem[]): ChipItem[] {
    const entries = value
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const newChips: ChipItem[] = [];
    for (const email of entries) {
      const alreadyAdded =
        existing.some((c) => c.label === email) ||
        newChips.some((c) => c.label === email);
      if (!alreadyAdded) {
        newChips.push({
          id: email,
          label: email,
          error: !EMAIL_REGEX.test(email),
        });
      }
    }
    return newChips;
  }

  function addEmail(value: string) {
    const newChips = parseEmails(value, chips);
    if (newChips.length > 0) {
      setChips((prev) => [...prev, ...newChips]);
    }
    setInputValue("");
  }

  function removeChip(id: string) {
    setChips((prev) => prev.filter((c) => c.id !== id));
  }

  function handleSubmit() {
    const pending = inputValue.trim();
    const allChips = pending
      ? [...chips, ...parseEmails(pending, chips)]
      : chips;

    if (pending) {
      setChips(allChips);
      setInputValue("");
    }

    const validEmails = allChips.filter((c) => !c.error).map((c) => c.label);

    if (validEmails.length === 0) {
      toast.error("Please add at least one valid email address");
      return;
    }

    onSubmit(validEmails);
  }

  return (
    <>
      <Modal.Body>
        <InputChipField
          chips={chips}
          onRemoveChip={removeChip}
          onAdd={addEmail}
          value={inputValue}
          onChange={setInputValue}
          placeholder="Add an email and press enter"
          layout="stacked"
        />
        {chips.some((c) => c.error) && (
          <div className="flex items-center gap-1 pt-1">
            <SvgAlertTriangle
              size={14}
              className="text-status-warning-05 shrink-0"
            />
            <Text secondaryBody text03>
              Some email addresses are invalid and will be skipped.
            </Text>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <BasicModalFooter
          cancel={
            <Disabled disabled={isSubmitting}>
              <Button prominence="tertiary" onClick={onClose}>
                Cancel
              </Button>
            </Disabled>
          }
          submit={
            <Disabled
              disabled={
                isSubmitting ||
                chips.length === 0 ||
                chips.every((c) => c.error)
              }
            >
              <Button onClick={handleSubmit}>Invite</Button>
            </Disabled>
          }
        />
      </Modal.Footer>
    </>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InviteUsersModal({
  open,
  onOpenChange,
}: InviteUsersModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isUsernameAuth = NEXT_PUBLIC_USE_USERNAME_AUTH;

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(() => {
      setIsSubmitting(false);
    }, 200);
  }, [onOpenChange]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        if (!isSubmitting) handleClose();
      } else {
        onOpenChange(next);
      }
    },
    [handleClose, isSubmitting, onOpenChange]
  );

  async function handleCreateUser(username: string, password: string) {
    setIsSubmitting(true);
    try {
      await createUserByAdmin(username, password);
      toast.success(`User "${username}" created successfully`);
      handleClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create user"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleInviteEmails(emails: string[]) {
    setIsSubmitting(true);
    try {
      await inviteUsers(emails);
      toast.success(
        `Invited ${emails.length} user${emails.length > 1 ? "s" : ""}`
      );
      handleClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to invite users"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <Modal.Content width="sm" height="fit">
        <Modal.Header
          icon={SvgUsers}
          title={isUsernameAuth ? "Create User" : "Invite Users"}
          onClose={isSubmitting ? undefined : handleClose}
        />

        {isUsernameAuth ? (
          <UsernameCreateUserForm
            isSubmitting={isSubmitting}
            onSubmit={handleCreateUser}
            onClose={handleClose}
          />
        ) : (
          <EmailInviteForm
            isSubmitting={isSubmitting}
            onSubmit={handleInviteEmails}
            onClose={handleClose}
          />
        )}
      </Modal.Content>
    </Modal>
  );
}
