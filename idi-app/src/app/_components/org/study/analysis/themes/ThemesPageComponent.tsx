"use client";

import React, { useState, useMemo, useEffect } from "react";
import { api } from "@/trpc/react";
import { ClipLoader } from "react-spinners";
import SplitScreenLayout from "@/app/_components/layouts/org/SplitScreenLayout";
import CardTable from "@/app/_components/reusable/CardTable";
import { Theme } from "@shared/generated/client";
import BasicTag from "@/app/_components/reusable/BasicTag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MagnifyingGlass,
  Plus,
  DotsThree,
  ArrowRight,
  Trash,
} from "@phosphor-icons/react";
import ThemeDetailsView from "./ThemeDetailsView";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import Fuse from "fuse.js";
import { useQueryClient } from "@tanstack/react-query";
import BasicInput from "@/app/_components/reusable/BasicInput";
import BasicTextArea from "@/app/_components/reusable/BasicTextArea";
import BasicPopover from "@/app/_components/reusable/BasicPopover";
import BasicConfirmationModal from "@/app/_components/reusable/BasicConfirmationModal";
import { useSearchParams } from "next/navigation";

interface ThemesPageComponentProps {
  studyId: string;
  orgId: string;
}

const ThemesPageComponent: React.FC<ThemesPageComponentProps> = ({
  studyId,
  orgId,
}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newThemeName, setNewThemeName] = useState("");
  const [newThemeDescription, setNewThemeDescription] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [editThemeName, setEditThemeName] = useState("");
  const [editThemeDescription, setEditThemeDescription] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [themeToDelete, setThemeToDelete] = useState<Theme | null>(null);

  const { data: themes, isLoading } = api.themes.getStudyThemes.useQuery(
    { studyId },
    { refetchOnWindowFocus: false },
  );

  const { data: selectedThemeDetails, isLoading: isLoadingThemeDetails } =
    api.themes.getThemeDetails.useQuery(
      { themeId: selectedThemeId ?? "", studyId, orgId },
      { enabled: !!selectedThemeId },
    );

  const createThemeMutation = api.themes.createTheme.useMutation({
    onSuccess: () => {
      setIsCreateModalOpen(false);
      setNewThemeName("");
      setNewThemeDescription("");
      void queryClient.invalidateQueries({
        queryKey: [["themes", "getStudyThemes"], { input: { studyId } }],
      });
      toast({
        title: "Theme created successfully",
        variant: "default",
        duration: 3000,
      });
    },
    onError: (error) => {
      toast({
        title: "Error creating theme",
        description: error.message,
        variant: "destructive",
        duration: 3000,
      });
    },
  });

  const editThemeMutation = api.themes.editTheme.useMutation({
    onSuccess: () => {
      setIsEditModalOpen(false);
      setEditingTheme(null);
      void queryClient.invalidateQueries({
        queryKey: [["themes", "getStudyThemes"], { input: { studyId } }],
      });
      toast({
        title: "Theme updated successfully",
        variant: "default",
        duration: 3000,
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating theme",
        description: error.message,
        variant: "destructive",
        duration: 3000,
      });
    },
  });

  const deleteThemeMutation = api.themes.deleteTheme.useMutation({
    onSuccess: () => {
      setIsDeleteModalOpen(false);
      setThemeToDelete(null);
      void queryClient.invalidateQueries({
        queryKey: [["themes", "getStudyThemes"], { input: { studyId } }],
      });
      toast({
        title: "Theme deleted successfully",
        variant: "default",
        duration: 3000,
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting theme",
        description: error.message,
        variant: "destructive",
        duration: 3000,
      });
    },
  });

  const handleCreateTheme = async () => {
    try {
      await createThemeMutation.mutateAsync({
        studyId,
        name: newThemeName,
        description: newThemeDescription,
      });
    } catch (error) {
      console.error("Error creating theme:", error);
    }
  };

  const handleCloseThemeDetails = () => {
    setSelectedThemeId(null);
  };

  const handleEditTheme = (theme: Theme) => {
    setEditingTheme(theme);
    setEditThemeName(theme.name);
    setEditThemeDescription(theme.description ?? "");
    setIsEditModalOpen(true);
  };

  const handleDeleteTheme = (theme: Theme) => {
    setThemeToDelete(theme);
    setIsDeleteModalOpen(true);
  };

  const handleSaveEditTheme = async () => {
    if (editingTheme) {
      try {
        await editThemeMutation.mutateAsync({
          themeId: editingTheme.id,
          name: editThemeName,
          description: editThemeDescription,
        });
      } catch (error) {
        console.error("Error editing theme:", error);
      }
    }
  };

  const sortedThemes = useMemo(() => {
    return themes?.sort((a, b) => b.quoteCount - a.quoteCount) ?? [];
  }, [themes]);

  const fuse = useMemo(() => {
    if (!sortedThemes) return null;
    return new Fuse(sortedThemes, {
      keys: ["name", "description"],
      threshold: 0.3,
    });
  }, [sortedThemes]);

  const filteredThemes = useMemo(() => {
    if (!searchTerm || !fuse) return sortedThemes;
    return fuse.search(searchTerm).map((result) => result.item);
  }, [searchTerm, fuse, sortedThemes]);

  const renderActionsMenu = (theme: Theme) => (
    <BasicPopover
      trigger={
        <div onClick={(e) => e.stopPropagation()}>
          <DotsThree size={24} className="cursor-pointer text-theme-600" />
        </div>
      }
      options={[
        {
          text: "Edit Theme",
          icon: <ArrowRight size={16} />,
          onClick: (e) => {
            e.stopPropagation();
            handleEditTheme(theme);
          },
          className: "w-40 justify-between",
        },
        {
          text: "Delete Theme",
          icon: <Trash size={16} />,
          onClick: (e) => {
            e.stopPropagation();
            handleDeleteTheme(theme);
          },
          color: "text-red-500",
          className: "w-40 justify-between",
        },
      ]}
    />
  );

  const columns = [
    { key: "name", header: "Name", width: "35%", className: "justify-start" },
    {
      key: "quoteCount",
      header: "# Quotes",
      width: "30%",
      className: "justify-end text-right",
    },
    {
      key: "source",
      header: "Source",
      width: "25%",
      className: "justify-end text-right",
    },
    {
      key: "actions",
      header: "Actions",
      width: "10%",
      className: "justify-end text-right",
    },
  ];

  const tableData =
    filteredThemes?.map((theme) => ({
      name: theme.name,
      quoteCount: theme.quoteCount,
      source: (
        <div className="flex w-full justify-end">
          <BasicTag color="bg-[#D5DDE1]" borderColor="border-[#426473]">
            {theme.source === "MANUAL" ? "Manual" : "AI Generated"}
          </BasicTag>
        </div>
      ),
      actions: renderActionsMenu(theme),
      originalTheme: theme,
    })) ?? [];

  useEffect(() => {
    const themeFromUrl = searchParams.get("selectedTheme");
    if (themeFromUrl) {
      setSelectedThemeId(themeFromUrl);
    }
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-theme-off-white">
        <ClipLoader size={50} color="grey" loading={true} />
      </div>
    );
  }

  const confirmDeleteTheme = async () => {
    if (themeToDelete) {
      try {
        await deleteThemeMutation.mutateAsync({
          themeId: themeToDelete.id,
        });
      } catch (error) {
        console.error("Error deleting theme:", error);
      }
    }
  };

  return (
    <>
      <SplitScreenLayout
        mainContent={
          <div className="flex flex-col gap-4">
            <div className="text-lg font-medium text-theme-900">Themes</div>
            <p className="text-sm text-theme-600">
              Themes are concepts that our AI analysis identifies throughout
              your study responses. Themes can be created or generated via AI.
              Note that when creating a new theme, it will only apply to
              interviews that occur after the theme is added.
            </p>
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-grow">
                <MagnifyingGlass
                  size={20}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-600"
                />
                <Input
                  className="w-full py-2 pl-10 pr-4"
                  placeholder="Search themes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button
                className="bg-[#426473] text-theme-off-white hover:bg-[#2F505F]"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus size={16} className="mr-2" />
                Create New
              </Button>
            </div>
            <div className="mt-6">
              <CardTable
                data={tableData}
                columns={columns}
                rowStyle={(row) => ({
                  borderLeft: `4px solid ${(row.originalTheme as Theme).tagColor}`,
                  ...(selectedThemeId === (row.originalTheme as Theme).id
                    ? {
                        borderColor: "var(--theme-500)",
                        boxShadow: "shadow-sm",
                      }
                    : {}),
                })}
                isRowSelected={(row) =>
                  selectedThemeId === (row.originalTheme as Theme).id
                }
                onRowClick={(row) =>
                  setSelectedThemeId((row.originalTheme as Theme).id)
                }
              />
            </div>
          </div>
        }
        showRightContent={!!selectedThemeId}
        rightContent={
          selectedThemeDetails && !isLoadingThemeDetails ? (
            <ThemeDetailsView
              theme={selectedThemeDetails}
              onClose={handleCloseThemeDetails}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ClipLoader size={50} color="grey" loading={true} />
            </div>
          )
        }
      />

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Theme</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-theme-600">
            Themes are concepts that our AI analysis identifies throughout your
            study responses. When you add a new theme, future interviews will be
            analyzed to identify the theme in responses.
          </div>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label
                htmlFor="name"
                className="text-sm font-medium text-theme-900"
              >
                Name
              </label>
              <BasicInput
                id="name"
                placeholder="Theme Name"
                value={newThemeName}
                onSetValue={(value) => setNewThemeName(value)}
              />
            </div>
            <div className="grid gap-2">
              <label
                htmlFor="description"
                className="text-sm font-medium text-theme-900"
              >
                Description
              </label>
              <BasicTextArea
                id="description"
                placeholder="Theme Description"
                value={newThemeDescription}
                onSetValue={(value) => setNewThemeDescription(value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreateTheme}
              className="text-theme-off-white"
            >
              Create Theme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Theme</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-theme-600">
            Edit the name and description of your theme.
          </div>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label
                htmlFor="edit-name"
                className="text-sm font-medium text-theme-900"
              >
                Name
              </label>
              <BasicInput
                id="edit-name"
                placeholder="Theme Name"
                value={editThemeName}
                onSetValue={(value) => setEditThemeName(value)}
              />
            </div>
            <div className="grid gap-2">
              <label
                htmlFor="edit-description"
                className="text-sm font-medium text-theme-900"
              >
                Description
              </label>
              <BasicTextArea
                id="edit-description"
                placeholder="Theme Description"
                value={editThemeDescription}
                onSetValue={(value) => setEditThemeDescription(value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSaveEditTheme}
              className="text-theme-off-white"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BasicConfirmationModal
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title="Delete Theme"
        subtitle="Deleting a theme will remove all associated quotes. Are you sure you want to delete?"
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteTheme}
        confirmButtonText="Delete"
        confirmButtonColor="bg-red-600"
      />
    </>
  );
};

export default ThemesPageComponent;
