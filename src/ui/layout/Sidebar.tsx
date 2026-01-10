import React, { useState, useEffect } from 'react';
import {
  Button,
  NavLink,
  Group,
  Text,
  Box,
  Stack,
} from '@mantine/core';

import {Icon} from '../common/Icon';

import { getStorySections, getRootSections } from '../../models/sections';
import { type Project, type StoryMeta, client } from '../../api/client';
import type { StorySection, RootSection } from '../../hooks/useNavigation';

type SidebarMode = 'projects' | 'project' | 'story';

type SidebarProps = {
  mode: SidebarMode;

  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onBackToProjects: () => void;

  stories: StoryMeta[];
  selectedStoryId: string | null;
  onSelectStory: (id: string) => void;

  storySection: StorySection;
  onSelectStorySection: (section: StorySection) => void;
  onBackToProjectFromStory: () => void;

  rootSection: RootSection;
  onSelectRootSection: (section: RootSection) => void;

  /** Opens the API key / settings modal */
  onOpenSettings: () => void;
  onOpenDevTools: () => void;
};

const SidebarCard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <Box p="xs">{children}</Box>;
};

// ─────────────────────────────────────────────────────────────
// NAVIGATION ITEM – shared wrapper around Mantine NavLink
// ─────────────────────────────────────────────────────────────

type NavItemProps = {
  icon?: string;
  label?: string;
  active?: boolean;
  p?: string;
  onClick?: () => void;
  [key: string]: any;
};

const NavItem: React.FC<NavItemProps> = ({
  icon,
  ...props
}) => {
  return (
    <NavLink
      {...props}
      leftSection={
        icon ? (
          <Icon
            type={icon as any}
            size={20}
            style={{ opacity: 0.2 }}
          />
        ) : null
      }
      style={{
        borderRadius: '24px',
      }}
    />
  );
};

const NavGroupLabel = ({
  title
}: { title: any }) => {
  return (
    <Group m="xs" mt="lg">
      <Text size="sm" fw={700}>
        {title}
      </Text>
    </Group>
  );
};

const BackButton = ({
  onBack,
  label = "Back"
}: { onBack: any, label?: string }) => {
  return (
    <Group p="xs">
      <Button
        justify="left"
        leftSection={<Icon type="back" size={16} />}
        variant="transparent"
        size="s"
        onClick={onBack}
        flex={1}
      >
        {label}
      </Button>
    </Group>
  );
};

// ─────────────────────────────────────────────────────────────
// PROJECTS ROOT SIDEBAR
// ─────────────────────────────────────────────────────────────

type ProjectsSidebarProps = {
  rootSection: RootSection;
  onSelectRootSection: (section: RootSection) => void;
  isDevMode: boolean;
};

const ProjectsSidebar: React.FC<ProjectsSidebarProps> = ({
  rootSection,
  onSelectRootSection,
  isDevMode,
}) => {
  return (
    <SidebarCard>
      <NavGroupLabel title="Distil"/>
      <Stack gap="1px">
        <NavItem
          icon="project"
          label="Projects"
          active={rootSection === 'projects'}
          p="xs"
          onClick={() => {
            onSelectRootSection('projects');
          }}
        />
        {getRootSections({ isDevMode, implementedOnly: false })
          .filter(section => section.id !== 'projects') // Projects shown above
          .map(section => (
            <NavItem
              key={section.id}
              icon={section.id}
              label={section.label}
              active={rootSection === section.id}
              onClick={() => onSelectRootSection(section.id as RootSection)}
            />
          ))}
      </Stack>
    </SidebarCard>
  );
};

// ─────────────────────────────────────────────────────────────
// PROJECT → STORY LIST SIDEBAR
// ─────────────────────────────────────────────────────────────

type ProjectSidebarProps = {
  currentProject: Project | undefined;
  onBackToProjects: () => void;
};

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  currentProject,
  onBackToProjects,
}) => {
  return (
    <SidebarCard>
      {/* Back to PROJECTS */}
      <BackButton onBack={onBackToProjects}/>

      <NavGroupLabel title={currentProject?.name ?? 'Untitled project'}/>
      <Stack gap="1px">
        <NavItem
          icon='stories'
          label="Stories"
          active={true}
          p="xs"
          onClick={() => {}}
        />
      </Stack>
    </SidebarCard>
  );
};

// ─────────────────────────────────────────────────────────────
// STORY DETAIL SIDEBAR
// ─────────────────────────────────────────────────────────────

type StorySidebarProps = {
  currentStory: StoryMeta | undefined;
  section: StorySection;
  onBackToProjectFromStory: () => void;
  onSelectStorySection: (section: StorySection) => void;
};

const StorySidebar: React.FC<StorySidebarProps> = ({
  currentStory,
  section,
  onBackToProjectFromStory,
  onSelectStorySection,
}) => {
  return (
    <SidebarCard>
      <BackButton onBack={onBackToProjectFromStory}/>

      <NavGroupLabel title={currentStory?.title ?? 'Untitled story'}/>

      <Stack gap="1px">
        {getStorySections({ implementedOnly: false }).map(storySection => (
          <NavItem
            key={storySection.id}
            icon={storySection.id}
            label={storySection.label}
            active={section === storySection.id}
            onClick={() => onSelectStorySection(storySection.id as StorySection)}
          />
        ))}
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
  onBackToProjects,

  stories,
  selectedStoryId,

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
    client.isDevMode().then((response) => {
      if (response.ok) setIsDevMode(response.data);
    });
  }, []);

  const currentProject = projects.find((p) => p.id === selectedProjectId);
  const currentStory = stories.find((s) => s.id === selectedStoryId);

  let content: React.ReactNode;

  // PROJECTS ROOT MODE
  if (mode === 'projects') {
    content = (
      <ProjectsSidebar
        rootSection={rootSection}
        onSelectRootSection={onSelectRootSection}
        isDevMode={isDevMode}
      />
    );
  } else if (mode === 'story') {
    // STORY MODE
    content = (
      <StorySidebar
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
        onBackToProjects={onBackToProjects}
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
          <Icon type="settings" size={20} />
        </Button>
        {isDevMode && (
          <Button
            variant="subtle"
            onClick={onOpenDevTools}
            p="xs"
          >
            <Icon type="console" size={20} />
          </Button>
        )}
      </Group>
    </Box>
  );
};