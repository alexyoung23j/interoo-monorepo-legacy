"use client";

import React, { useState, useMemo } from "react";
import { api } from "@/trpc/react";
import { ClipLoader } from "react-spinners";
import SplitScreenLayout from "@/app/_components/layouts/org/SplitScreenLayout";
import CardTable from "@/app/_components/reusable/CardTable";
import { Theme } from "@shared/generated/client";
import BasicTag from "@/app/_components/reusable/BasicTag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react";
import ThemeDetailsView from "./ThemeDetailsView";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import Fuse from "fuse.js";
import { useQueryClient } from "@tanstack/react-query";
import BasicInput from "@/app/_components/reusable/BasicInput";
import BasicTextArea from "@/app/_components/reusable/BasicTextArea";

interface ThemesPageComponentProps {
  studyId: string;
  orgId: string;
}

const ThemesPageComponent: React.FC<ThemesPageComponentProps> = ({
  studyId,
  orgId,
}) => {
  const queryClient = useQueryClient();

  const { data: themes, isLoading } = api.themes.getStudyThemes.useQuery(
    { studyId },
    { refetchOnWindowFocus: false },
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);

  const { data: selectedThemeDetails, isLoading: isLoadingThemeDetails } =
    api.themes.getThemeDetails.useQuery(
      { themeId: selectedThemeId ?? "", studyId, orgId },
      { enabled: !!selectedThemeId },
    );

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newThemeName, setNewThemeName] = useState("");
  const [newThemeDescription, setNewThemeDescription] = useState("");
  const { toast } = useToast();

  const createThemeMutation = api.themes.createTheme.useMutation({
    onSuccess: () => {
      setIsCreateModalOpen(false);
      setNewThemeName("");
      setNewThemeDescription("");
      // Invalidate and refetch the getStudyThemes query
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

  const fuse = useMemo(() => {
    if (!themes) return null;
    return new Fuse(themes, {
      keys: ["name", "description"],
      threshold: 0.3,
    });
  }, [themes]);

  const filteredThemes = useMemo(() => {
    if (!searchTerm || !fuse) return themes;
    return fuse.search(searchTerm).map((result) => result.item);
  }, [searchTerm, fuse, themes]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-theme-off-white">
        <ClipLoader size={50} color="grey" loading={true} />
      </div>
    );
  }

  const columns = [
    { key: "name", header: "Name", width: "40%", className: "justify-start" },
    {
      key: "quoteCount",
      header: "# Quotes",
      width: "30%",
      className: "justify-end text-right",
    },
    {
      key: "source",
      header: "Source",
      width: "30%",
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
            AI Generated
          </BasicTag>
        </div>
      ),
      originalTheme: theme,
    })) ?? [];

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
                })}
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
    </>
  );
};

export default ThemesPageComponent;
