// src/ui/playground/WizardTesterView.tsx
import React, { useState } from 'react';
import { Stack, Select } from '@mantine/core';
import { listWizardIds, getWizardConfig } from '../../wizards/registry';
import type { WizardId } from '../../wizards/types';
import { WizardTesterRunnerView } from './WizardTesterRunnerView';

export const WizardTesterView: React.FC = () => {
  const [selectedWizardId, setSelectedWizardId] = useState<WizardId | null>(null);

  const availableWizards = listWizardIds();

  return (
    <Stack gap="md" p="md" style={{ flex: 1, minHeight: 0, height: '100%' }}>
      <Select
        placeholder="Select a wizard to test"
        value={selectedWizardId}
        onChange={(value) => {
          setSelectedWizardId(value as WizardId | null);
        }}
        data={availableWizards.map((wizardId) => {
          const config = getWizardConfig(wizardId);
          return {
            value: wizardId,
            label: `${config.title} (${config.targetDoc})`,
          };
        })}
        searchable
        size="md"
      />

      {selectedWizardId ? (
        <WizardTesterRunnerView wizardId={selectedWizardId} />
      ) : null}
    </Stack>
  );
};