import React, { useState, useEffect } from 'react';
import {
  Button,
  NavLink,
  Group,
  Text,
  Box,
  Stack,
} from '@mantine/core';

import {
  ArrowLeft,
  SquareLibrary,
  NotebookPen,
  FileText,
  Lightbulb,
  Route,
  Users,
  MapPin,
  Settings2,
  Feather,
  FlaskConical,
  Globe,
  Bug
} from 'lucide-react';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { Project, StoryMeta } from '../../api/alineaClient';
import { alineaClient } from '../../api/alineaClient';

type SidebarMode = 'projects' | 'project' | 'story';
export type StorySection =
  | 'prose'
  | 'outline'
  | 'world'
  | 'brief'
  | 'characters'
  | 'locations';
export type RootSection = 'projects' | 'manifest' | 'assistant' | 'playground';

type SidebarProps = {
  mode: SidebarMode;

  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  onBackToProjects: () => void;
  onReorderProjects: (ids: string[]) => void;

  stories: StoryMeta[];
  selectedStoryId: string | null;
  onSelectStory: (id: string) => void;
  onReorderStories: (ids: string[]) => void;

  storySection: StorySection;
  onSelectStorySection: (section: StorySection) => void;
  onBackToProjectFromStory: () => void;

  rootSection: RootSection;
  onSelectRootSection: (section: RootSection) => void;

  /** Opens the API key / settings modal */
  onOpenSettings: () => void;
  onOpenDevTools: () => void;
};

// ─────────────────────────────────────────────────────────────
// Sortable item wrapper
// ─────────────────────────────────────────────────────────────
function SortableItem({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

const SidebarCard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <Box p="xs">{children}</Box>;
};

// ─────────────────────────────────────────────────────────────
// NAVIGATION ITEM – shared wrapper around Mantine NavLink
// ─────────────────────────────────────────────────────────────

type NavItemProps = Omit<React.ComponentProps<typeof NavLink>, 'leftSection'> & {
  /** Lucide icon component, e.g. SquareLibrary, Bot, NotebookPen */
  Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;

  /** Optional overrides for default icon props */
  iconProps?: React.SVGProps<SVGSVGElement>;
};

const NavItem: React.FC<NavItemProps> = ({
  Icon,
  iconProps,
  style,
  ...props
}) => {
  return (
    <NavLink
      {...props}
      leftSection={
        Icon ? (
          <Icon
            strokeWidth={1.5}
            size={20}
            style={{ opacity: 0.2 }}
            {...iconProps}
          />
        ) : null
      }
      style={{
        borderRadius: '24px',
        ...style,
      }}
    />
  );
};

// ─────────────────────────────────────────────────────────────
// PROJECTS ROOT SIDEBAR
// ─────────────────────────────────────────────────────────────

type ProjectsSidebarProps = {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  onReorderProjects: (ids: string[]) => void;
  sensors: any;
  rootSection: RootSection;
  onSelectRootSection: (section: RootSection) => void;
  isDevMode: boolean;
};

const ProjectsSidebar: React.FC<ProjectsSidebarProps> = ({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  onReorderProjects,
  sensors,
  rootSection,
  onSelectRootSection,
  isDevMode,
}) => {
  return (
    <SidebarCard>
      {/* PROJECTS */}
      <Group m="xs" mt="lg">
        <Text size="sm" fw={700}>
          Projects
        </Text>
      </Group>

      <Stack gap="1px">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={({ active, over }) => {
            if (!over || active.id === over.id) return;
            const oldIndex = projects.findIndex((p) => p.id === active.id);
            const newIndex = projects.findIndex((p) => p.id === over.id);
            const reordered = arrayMove(projects, oldIndex, newIndex);
            onReorderProjects(reordered.map((p) => p.id));
          }}
        >
          <SortableContext
            items={projects.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            {projects.map((p) => (
              <SortableItem key={p.id} id={p.id}>
                <NavItem
                  Icon={SquareLibrary}
                  label={p.name}
                  active={rootSection === 'projects' && p.id === selectedProjectId}
                  p="xs"
                  onClick={() => {
                    onSelectRootSection('projects');
                    onSelectProject(p.id);
                  }}
                />
              </SortableItem>
            ))}
          </SortableContext>
        </DndContext>
      </Stack>

      {/* SETTINGS */}
      <Group m="xs" mt="lg">
        <Text size="sm" fw={700}>
          Settings
        </Text>
      </Group>

      <Stack gap="1px">
        <NavItem
          Icon={Feather}
          label="Manifest"
          active={rootSection === 'manifest'}
          onClick={() => onSelectRootSection('manifest')}
        />
        {isDevMode && (
          <NavItem
            Icon={FlaskConical}
            label="Playground"
            active={rootSection === 'playground'}
            onClick={() => onSelectRootSection('playground')}
          />
        )}
      </Stack>
    </SidebarCard>
  );
};

// ─────────────────────────────────────────────────────────────
// PROJECT → STORY LIST SIDEBAR
// ─────────────────────────────────────────────────────────────

type ProjectSidebarProps = {
  currentProject: Project | undefined;
  stories: StoryMeta[];
  selectedStoryId: string | null;
  onBackToProjects: () => void;
  onSelectStory: (id: string) => void;
  onReorderStories: (ids: string[]) => void;
  sensors: any;
};

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  currentProject,
  stories,
  selectedStoryId,
  onBackToProjects,
  onSelectStory,
  onReorderStories,
  sensors,
}) => {
  return (
    <SidebarCard>
      {/* Back to PROJECTS */}
      <Group p="xs">
        <Button
          justify="left"
          leftSection={<ArrowLeft size={16} />}
          variant="transparent"
          size="s"
          onClick={onBackToProjects}
          flex={1}
        >
          Projects
        </Button>
      </Group>

      <Group m="xs" mt="lg">
        <Text size="sm" fw={700} flex={1}>
          {currentProject?.name ?? 'Project'}
        </Text>
      </Group>

      <Stack gap="1px">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={({ active, over }) => {
            if (!over || active.id === over.id) return;
            const oldIndex = stories.findIndex((s) => s.id === active.id);
            const newIndex = stories.findIndex((s) => s.id === over.id);
            const reordered = arrayMove(stories, oldIndex, newIndex);
            onReorderStories(reordered.map((s) => s.id));
          }}
        >
          <SortableContext
            items={stories.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {stories.map((s) => (
              <SortableItem key={s.id} id={s.id}>
                <NavItem
                  Icon={FileText}
                  label={s.title}
                  active={s.id === selectedStoryId}
                  p="xs"
                  onClick={() => {
                    onSelectStory(s.id);
                  }}
                />
              </SortableItem>
            ))}
          </SortableContext>
        </DndContext>
      </Stack>
    </SidebarCard>
  );
};

// ─────────────────────────────────────────────────────────────
// STORY DETAIL SIDEBAR
// ─────────────────────────────────────────────────────────────

type StorySidebarProps = {
  currentProject: Project | undefined;
  currentStory: StoryMeta | undefined;
  section: StorySection;
  onBackToProjectFromStory: () => void;
  onSelectStorySection: (section: StorySection) => void;
};

const StorySidebar: React.FC<StorySidebarProps> = ({
  currentProject,
  currentStory,
  section,
  onBackToProjectFromStory,
  onSelectStorySection,
}) => {
  return (
    <SidebarCard>
      <Group p="xs">
        <Button
          justify="left"
          leftSection={<ArrowLeft size={16} />}
          variant="transparent"
          size="s"
          onClick={onBackToProjectFromStory}
          flex={1}
        >
          {currentProject?.name ?? 'Untitled story'}
        </Button>
      </Group>

      <Group m="xs" mt="lg">
        <Text size="sm" fw={700}>
          {currentStory?.title ?? 'Untitled story'}
        </Text>
      </Group>

      <Stack gap="1px">
        <NavItem
          Icon={NotebookPen}
          label="Text"
          active={section === 'prose'}
          onClick={() => onSelectStorySection('prose')}
        />
        <NavItem
          Icon={Lightbulb}
          label="Brief / Idea"
          active={section === 'brief'}
          onClick={() => onSelectStorySection('brief')}
        />
        <NavItem
          Icon={Route}
          label="Outline"
          active={section === 'outline'}
          onClick={() => onSelectStorySection('outline')}
        />
        <NavItem
          Icon={Globe}
          label="World"
          active={section === 'world'}
          onClick={() => onSelectStorySection('world')}
        />
        <NavItem
          Icon={Users}
          label="Characters"
          active={section === 'characters'}
          onClick={() => onSelectStorySection('characters')}
        />
        <NavItem
          Icon={MapPin}
          label="Locations"
          active={section === 'locations'}
          onClick={() => onSelectStorySection('locations')}
        />
      </Stack>
    </SidebarCard>
  );
};

// ─────────────────────────────────────────────────────────────
// SIDEBAR ROOT COMPONENT
// ─────────────────────────────────────────────────────────────

export const Sidebar: React.FC<SidebarProps> = ({
  mode,
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  onBackToProjects,
  onReorderProjects,

  stories,
  selectedStoryId,
  onSelectStory,
  onReorderStories,

  storySection,
  onSelectStorySection,
  onBackToProjectFromStory,

  rootSection,
  onSelectRootSection,

  onOpenSettings,
  onOpenDevTools,
}) => {
  const [isDevMode, setIsDevMode] = useState(false);

  useEffect(() => {
    alineaClient.isDevMode().then((response) => {
      if (response.ok) setIsDevMode(response.data);
    });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const currentProject = projects.find((p) => p.id === selectedProjectId);
  const currentStory = stories.find((s) => s.id === selectedStoryId);

  let content: React.ReactNode;

  // PROJECTS ROOT MODE
  if (mode === 'projects') {
    content = (
      <ProjectsSidebar
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={onSelectProject}
        onCreateProject={onCreateProject}
        onReorderProjects={onReorderProjects}
        sensors={sensors}
        rootSection={rootSection}
        onSelectRootSection={onSelectRootSection}
        isDevMode={isDevMode}
      />
    );
  } else if (mode === 'story') {
    // STORY MODE
    content = (
      <StorySidebar
        currentProject={currentProject}
        currentStory={currentStory}
        section={storySection}
        onBackToProjectFromStory={onBackToProjectFromStory}
        onSelectStorySection={onSelectStorySection}
      />
    );
  } else {
    // PROJECT-DETAIL MODE (show stories list)
    content = (
      <ProjectSidebar
        currentProject={currentProject}
        stories={stories}
        selectedStoryId={selectedStoryId}
        onBackToProjects={onBackToProjects}
        onSelectStory={onSelectStory}
        onReorderStories={onReorderStories}
        sensors={sensors}
      />
    );
  }

  return (
    <Box
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Main scrollable sidebar content */}
      <Box style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{content}</Box>

      {/* Fixed settings button at bottom */}
      <Group p="xs" pt="sm" justify="space-between">
        <Button
          variant="subtle"
          onClick={onOpenSettings}
          p="xs"
        >
          <Settings2 size={20} />
        </Button>
        {isDevMode && (
          <Button
            variant="subtle"
            onClick={onOpenDevTools}
            p="xs"
          >
            <Bug size={20} />
          </Button>
        )}
      </Group>
    </Box>
  );
};