'use client';

import React, { useState } from 'react';
import { useTemplates } from '@/lib/hooks/useTemplates';
import { TemplatePanelUI } from './TemplatePanelUI';
import { ErrorBoundaryWrapper } from '@/components/shared/ErrorBoundaryWrapper';
import TemplateEditor from './TemplateEditor';
import type { TrainingTemplateRecord } from '@/lib/pocketbase/types';

interface TemplatePanelProps {
    isOpen: boolean;
    onClose: () => void;
    // We will expand these when implementing the interactions
    onApplyTemplate: (templateId: string) => Promise<void>;
}

export function TemplatePanel({ isOpen, onClose, onApplyTemplate }: TemplatePanelProps) {
    const { templates, isLoading, isValidating, error, refresh } = useTemplates({ isOpen });
    const [activeTab, setActiveTab] = useState<'system' | 'my'>('system');
    const [filterType, setFilterType] = useState<'all' | 'warmup' | 'training_day'>('all');
    const [isApplying, setIsApplying] = useState(false);
    const [editorTemplate, setEditorTemplate] = useState<TrainingTemplateRecord | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const handleApply = async (templateId: string) => {
        if (isApplying) return;
        setIsApplying(true);
        try {
            await onApplyTemplate(templateId);
            onClose(); // Close panel after successful application
        } catch (err) {
            // Error handling can be added here, or let the parent catch it
            console.error('Failed to apply template:', err);
        } finally {
            setIsApplying(false);
        }
    };

    const handleCreateTemplate = () => {
        setIsCreating(true);
        setEditorTemplate(null);
    };

    const handleEditorClose = () => {
        setIsCreating(false);
        setEditorTemplate(null);
        void refresh();
    };

    // Derived state for filtering
    const filteredTemplates = templates.filter(t => {
        // 1. Tab filtering
        const isSystemTab = activeTab === 'system';
        if (isSystemTab && !t.is_system) return false;
        if (!isSystemTab && t.is_system) return false;

        // 2. Type filtering
        if (filterType !== 'all') {
            if (t.type !== filterType) return false;
        }

        return true;
    });

    return (
        <ErrorBoundaryWrapper>
            <TemplatePanelUI
                isOpen={isOpen}
                onClose={onClose}
                templates={filteredTemplates}
                isLoading={isLoading}
                isValidating={isValidating}
                fetchError={error}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                filterType={filterType}
                setFilterType={setFilterType}
                isApplying={isApplying}
                onApply={handleApply}
                onCreateTemplate={handleCreateTemplate}
                onRefresh={refresh}
            />
            {isCreating && (
                <TemplateEditor
                    template={editorTemplate}
                    defaultType={filterType === 'all' ? 'training_day' : filterType}
                    onClose={handleEditorClose}
                />
            )}
        </ErrorBoundaryWrapper>
    );
}
