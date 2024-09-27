import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BasicConfirmationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  body?: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  showCancel?: boolean;
  showSave?: boolean;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonColor?: string;
}

const BasicConfirmationModal: React.FC<BasicConfirmationModalProps> = ({
  isOpen,
  onOpenChange,
  title,
  subtitle,
  body,
  onCancel,
  onConfirm,
  showCancel = true,
  showSave = true,
  confirmButtonText = "Confirm",
  cancelButtonText = "Cancel",
  confirmButtonColor = "bg-theme-600",
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col border border-theme-200 bg-theme-off-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-theme-900">
            {title}
          </DialogTitle>
          {subtitle && (
            <DialogDescription className="text-sm text-theme-600">
              {subtitle}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="flex-grow">{body}</div>
        <DialogFooter className="flex flex-row items-center !justify-center">
          {showCancel && (
            <Button
              variant="secondary"
              onClick={onCancel}
              className="border-theme-200 text-theme-600 hover:bg-theme-100 hover:text-theme-700"
            >
              {cancelButtonText}
            </Button>
          )}
          {showSave && (
            <Button
              variant="default"
              onClick={onConfirm}
              className={`${confirmButtonColor} bg-theme-600 text-theme-off-white`}
            >
              {confirmButtonText}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BasicConfirmationModal;
