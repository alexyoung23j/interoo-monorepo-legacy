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
      <DialogContent className="flex max-w-[94vw] flex-col border border-theme-200 bg-theme-off-white md:max-w-[30vw]">
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
              variant="unstyled"
              onClick={onConfirm}
              className={`${confirmButtonColor ?? "bg-theme-600"} text-medium w-fit rounded-sm text-theme-off-white shadow hover:bg-theme-900/90`}
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
