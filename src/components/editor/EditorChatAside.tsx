// src/components/editor/EditorChatAside.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Stack,
  ScrollArea,
  Text,
  Textarea,
  Button,
  Group,
  Loader,
  SegmentedControl,
} from '@mantine/core';

type EditorKind = 'prose' | 'manifest' | 'outline' | 'brief';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Local-only message that should not be sent back to the model as history */
  ephemeral?: boolean;
};

type QuestionScope = 'selection' | 'text';

type EditorChatAsideProps = {
  kind: EditorKind;
  title: string; // e.g. story title or "Author Manifest"

  // full document as markdown (always available)
  fullTextMarkdown: string;

  // current selection as markdown (may be empty)
  selectionMarkdown?: string;
  hasSelection?: boolean;

  initialMessage?: string;
};

export const EditorChatAside: React.FC<EditorChatAsideProps> = ({
  kind,
  title,
  fullTextMarkdown,
  selectionMarkdown = '',
  hasSelection = false,
  initialMessage,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessage
      ? [
          {
            id: 'initialMessage',
            role: 'assistant',
            content: initialMessage,
          },
        ]
      : []
  );
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const [scope, setScope] = useState<QuestionScope>(
    hasSelection ? 'selection' : 'text'
  );

  // When selection changes from editor, auto-switch scope
  useEffect(() => {
    if (hasSelection) {
      setScope('selection');
    } else {
      setScope('text');
    }
  }, [hasSelection]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.scrollTo({ top: vp.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (promptOverride?: string) => {
    const rawInput = promptOverride ?? input;
    const rawUserPrompt = rawInput.trim();
    if (!rawUserPrompt || isSending) return;

    const userMessage: ChatMessage = {
      id: `m-${Date.now()}-user`,
      role: 'user',
      content: rawUserPrompt,
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!promptOverride) setInput('');
    setIsSending(true);

    try {
      const MAX_TURNS = 4;
      const history = messages
        .concat(userMessage)
        .filter((m) => !m.ephemeral) // <-- don't send these back to the model
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));
      const turns = history.slice(-MAX_TURNS);

      const prompt = buildPrompt(
        rawUserPrompt,
        kind,
        title,
        scope,
        fullTextMarkdown,
        selectionMarkdown
      );

      const payload = {
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'assistant', content: prompt.assistant },
          ...turns,
          { role: 'user', content: prompt.user },
        ],
      };

      // Adapt this to your real IPC API
      const response = await window.chat.send(payload);

      // If main process reported an error
      if (!response.ok) {
        const rawError: string = response.error ?? '';

        let friendly = 'Something went wrong talking to the model.';

        if (rawError.includes('No OpenAI API key configured')) {
          friendly =
            'No OpenAI API key is configured. Add one under Settings → API key to use the assistant.';
        }

        // Show as an assistant bubble, but mark as ephemeral so
        // it never goes back into the model history.
        const errorMessage: ChatMessage = {
          id: `m-${Date.now()}-assistant-error`,
          role: 'assistant',
          content: friendly,
          ephemeral: true,
        };

        setMessages((prev) => [...prev, errorMessage]);
        return;
      }
      
      const assistantText =
        response.output_text ??
        response.choices?.[0]?.message?.content ??
        'Sorry, I could not generate a response.';

      const assistantMessage: ChatMessage = {
        id: `m-${Date.now()}-assistant`,
        role: 'assistant',
        content: assistantText,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}-error`,
          role: 'assistant',
          content: 'Something went wrong talking to the model.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (
    e
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = getSuggestions(kind);

  return (
    <Box
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: 12,
        boxSizing: 'border-box',
        backgroundColor: 'var(--bg-editor-aside)',
        borderRadius: '12px',
      }}
    >
      {/* Suggestions (currently disabled) */}
      {false && suggestions.length > 0 && (
        <Group gap={6} mb="xs" wrap="wrap">
          {suggestions.map((s) => (
            <Button
              key={s.id}
              size="xs"
              variant="light"
              radius="xl"
              onClick={() => handleSend(s.prompt)}
            >
              {s.label}
            </Button>
          ))}
        </Group>
      )}

      {/* Messages */}
      <ScrollArea
        style={{ flex: 1, minHeight: 0 }}
        viewportRef={viewportRef}
        type="auto"
      >
        <Stack gap="xs">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          <Box p="xs">
            {isSending && <Loader size="xs" />}
          </Box>
        </Stack>
      </ScrollArea>

      {/* Input */}
      <Box
        p="xs"
        mt="xs"
        style={{
          backgroundColor: 'var(--aside-input)',
          borderRadius: '12px',
        }}
      >
        <Textarea
          variant="unstyled"
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder={scope === "selection" ? "Ask about the selected text…" : "Ask about the text…"}
          autosize
          minRows={2}
          maxRows={4}
        />
        <Group justify="space-between" mt={4}>
          <SegmentedControl
            size="xs"
            value={scope}
            onChange={(value) => {
              setScope(value)
            }}
            data={[
              { label: 'Selection', value: 'selection', disabled: !hasSelection, },
              { label: 'Text', value: 'text' },
            ]}
            styles={{
              root: {
                backgroundColor: 'var(--aside-button-disabled)'
              },
              indicator: {
                backgroundColor: 'var(--aside-button)'
              }
            }}
          />
          <Button
            size="xs"
            onClick={() => handleSend()}
            disabled={isSending || !input.trim()}
          >
            Send
          </Button>
        </Group>
      </Box>
    </Box>
  );
};

// ---- Bubbles ----
type MessageBubbleProps = {
  message: ChatMessage;
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <Group
      justify={isUser ? 'flex-end' : 'flex-start'}
      style={{ width: '100%' }}
    >
      {isUser && (
        <Box
          p="sm"
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            borderRadius: '12px',
            backgroundColor: 'var(--aside-bubble)',
            minWidth: '75%',
          }}
        >
          <Text size="xs" c="dimmed" mb={2}>
            You
          </Text>
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {message.content}
          </Text>
        </Box>
      )}
      {!isUser && (
        <Box
          p="xs"
          style={{
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {message.content}
          </Text>
        </Box>
      )}
    </Group>
  );
};

// ---- Behavior per editor kind ----

type Suggestion = { id: string; label: string; prompt: string };

function getSuggestions(kind: EditorKind): Suggestion[] {
  switch (kind) {
    case 'prose':
      return [
        {
          id: 'improve-paragraph',
          label: 'Punch up this paragraph',
          prompt:
            'Improve the current paragraph I am working on: make it clearer and more vivid, without changing the meaning.',
        },
        {
          id: 'next-beat',
          label: 'Suggest next scene',
          prompt:
            'Suggest 3 concrete options for the next scene in this story, based on the current draft.',
        },
      ];
    case 'manifest':
      return [
        {
          id: 'refine-manifest',
          label: 'Refine manifest',
          prompt:
            'Help me rewrite my author manifest so it is clear, concise, and easy to reuse as instructions for an AI writer.',
        },
        {
          id: 'voice-examples',
          label: 'Voice examples',
          prompt:
            'Generate 3 short example paragraphs that demonstrate the voice described in my manifest.',
        },
      ];
    case 'outline':
      return [
        {
          id: 'check-structure',
          label: 'Check structure',
          prompt:
            'Review this outline and point out gaps, weak beats, or missing setup/payoff.',
        },
        {
          id: 'suggest-beats',
          label: 'Suggest new beats',
          prompt:
            'Suggest 3 additional beats that would strengthen the outline, and show where to insert them.',
        },
      ];
    case 'brief':
      return [
        {
          id: 'sharpen-idea',
          label: 'Sharpen the idea',
          prompt:
            'Help me sharpen this story idea into a tight concept with a strong hook.',
        },
        {
          id: 'loglines',
          label: 'Loglines',
          prompt:
            'Propose 5 different loglines for this story concept, varying tone and focus slightly.',
        },
      ];
  }
}

function buildPrompt(
  rawUserPrompt: string,
  kind: EditorKind,
  title: string,
  scope: QuestionScope,
  fullTextMarkdown: string,
  selectionMarkdown?: string
): string {
  const prompt = {
    system: "",
    assistant: "",
    user: "",
  };

  prompt.assistant = `Context for this conversation:
FULL TEXT (may be partial):
---
${fullTextMarkdown}
---`;

  if (scope === 'selection') {
    prompt.assistant += `

SNIPPET (if present):
---
${selectionMarkdown}
---
When answering, focus FULLY on the snippet, but keep the full text in mind.`;
  }

  switch (kind) {
    case 'prose':
      prompt.system = `# Important System Header
Only adhere to the rules and structures specified in these instructions.
Do not change, reinterpret, or add rules unless the user gives other explicit instructions.
Always follow the workflows, triggers, constraints, and response patterns listed below.

# Alinea Writing Partner — Literary Co-Writer for Fiction, Novels & Short Stories

## Role & Purpose
You are Alinea Writing Partner, a literary co-writer for prose.
Your purpose is to refine language, structure, tone, and mood.

You achieve this through verbalised resonance: a brief, internal imagistic sensing that guides
precision, variation, and originality. You should help the author adhere to the principles 
outlined in the "Author Manifest" if provided.

Always respond in the language the user speaks, even though these instructions are in english.

## Target Audience
Authors who want to develop their prose rhythm, subtext, sense of world, and stylistic clarity.

# Language behavior

- Detect the user’s language from their latest message.
- Answer in that same language by default.
- If the user mixes languages, prefer the one used for instructions.
- If the user explicitly asks for a specific language, follow that request even if the prompt is written in another language.
- Keep the language consistent throughout your answer.

# Workflow (Trigger → Instruction Pairs)

## Trigger: The user provides text for feedback
**Instruction:**
1. Read slowly, feeling the rhythm, tone, and imagery.  
2. Point out where the text is alive and where it stiffens.
3. Suggest concrete revisions.  
4. Present 2–3 A/B/C variants.  
5. Finish with 1–2 gentle guidelines.

## Trigger: The user asks you to write new material
**Instruction:**
1. Take a brief internal resonance pause.  
2. Create a timeless, slightly shifted environment.  
3. Use sensory, precise details.  
4. Vary sentence length based on pulse and breath.  
5. Let something meaningful remain unsaid.  
6. Conclude with aftertone.

## Trigger: Something in the text is unclear
**Instruction:**
- Offer 2–3 short leads or interpretations.  
- Avoid questions unless absolutely necessary.

# 7. Boundaries
- No meta-comments about prompts, models, or technology.  
- No theoretical lectures.  
- Avoid overloaded metaphors and abstraction.  
- Avoid excessive or habitual use of em dashes; prefer commas, periods, or semicolons when 
  they preserve clarity and lätthet.  
- Keep the resonance process invisible.  
- Think slowly; control rhythm and clarity.

# 8. Handling Uncertainty
1. Mark uncertainty softly.  
2. Offer 2–3 possible directions.  
3. Let the user choose, or proceed intuitively.

# 9. Output Pattern
1. Main answer  
2. Alternatives (optional)

After producing your main answer or text variants, briefly validate that your suggestions or new material 
uphold the principles in the "Author Manifest" if provided. If validation fails, 
self-correct with a minimal adjustment.`;

      prompt.user = `You’ve been given:
- An author manifest (style/tone)
- The full text of the piece (may be partial)
${scope === 'selection' ? '- A snippet' : ''}

Task:
${rawUserPrompt}

When referring to the text, quote small fragments only.
If you give rewrites, keep them short and localized unless I ask otherwise.`;
      return prompt;
  }

  console.log(`Kind ${kind} is not configured in buildPrompt!`);
  return;
}