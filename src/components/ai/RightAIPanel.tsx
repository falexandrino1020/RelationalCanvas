import React, { useState, useEffect, useRef } from 'react';
import { SchemaModel, AIChatMessage } from '../../types/schema';
import { Mic, MicOff, Send, Sparkles, X, Check, ArrowRight, CornerDownLeft, Bot, User, AlertCircle } from 'lucide-react';

interface RightAIPanelProps {
  schema: SchemaModel;
  onApplySchemaUpdate: (newSchema: SchemaModel) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const RightAIPanel: React.FC<RightAIPanelProps> = ({
  schema,
  onApplySchemaUpdate,
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'msg_welcome',
      role: 'assistant',
      content: `Hello! I am your database design architect. I specialize in SQL schema modeling, entity relationships, normalization, and cross-dialect compatibility across PostgreSQL, MSSQL (T-SQL), MySQL, SQLite, DBML, and Mermaid.

Ask me to design tables, customize relationships, or provide SQL architectural guidance!`,
      timestamp: Date.now(),
    },
  ]);

  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechSupported(false);
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start speech recognition', err);
      }
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (promptText?: string) => {
    const userPrompt = promptText || input;
    if (!userPrompt.trim() || isLoading) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userMessage: AIChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: userPrompt.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt,
          schema,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: AIChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: data.explanation || 'I have analyzed your request and prepared the schema modifications below.',
        timestamp: Date.now(),
        proposedPatch: data.updatedSchema && JSON.stringify(data.updatedSchema) !== JSON.stringify(schema) ? {
          summary: data.summary || 'Proposed Schema Update',
          schemaSnapshot: data.updatedSchema,
          sqlPreview: data.sqlPreview,
        } : undefined,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.warn('AI assistance client fallback:', err);
      // Fallback response with scope checking and offline advisory/modification
      const fallbackResult = handleOfflineFallback(userPrompt, schema);

      const assistantMessage: AIChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: fallbackResult.explanation,
        timestamp: Date.now(),
        proposedPatch: fallbackResult.updatedSchema ? {
          summary: fallbackResult.summary,
          schemaSnapshot: fallbackResult.updatedSchema,
        } : undefined,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="w-80 md:w-96 border-l border-slate-800 bg-[#0E1526] flex flex-col select-none shrink-0 z-30 shadow-2xl relative">
      {/* Panel Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>Schema AI Co-Pilot</span>
              <span className="text-[10px] text-purple-400 font-mono font-normal">Gemini 3.1 Flash-Lite</span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Close AI Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* No Sign-In Required Banner */}
      <div className="px-3 py-1 bg-purple-950/40 border-b border-purple-900/40 flex items-center justify-between text-[10px] text-purple-300 font-mono">
        <span>✓ No Sign-In Required</span>
        <span>Google Free Tier (15 RPM / 1M TPM)</span>
      </div>

      {/* Quick Prompt Chips */}
      <div className="p-2 border-b border-slate-800/80 bg-slate-900/30 flex gap-1.5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => handleSendMessage('Add an audit log table linked to every update')}
          className="px-2 py-1 text-[11px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 whitespace-nowrap transition-colors shrink-0"
        >
          + Audit Log Table
        </button>
        <button
          onClick={() => handleSendMessage('Add user addresses table with foreign key to users')}
          className="px-2 py-1 text-[11px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 whitespace-nowrap transition-colors shrink-0"
        >
          + Address Table
        </button>
        <button
          onClick={() => handleSendMessage('Compare data types and compatibility between MSSQL and PostgreSQL')}
          className="px-2 py-1 text-[11px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 whitespace-nowrap transition-colors shrink-0"
        >
          MSSQL vs Postgres Types
        </button>
        <button
          onClick={() => handleSendMessage('Review this schema and suggest normalization or indexing improvements')}
          className="px-2 py-1 text-[11px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 whitespace-nowrap transition-colors shrink-0"
        >
          Design & Normalization Review
        </button>
      </div>

      {/* Chat Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 select-text">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-500 font-mono">
              {msg.role === 'user' ? (
                <>
                  <span>You</span>
                  <User className="w-3 h-3 text-indigo-400" />
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-purple-400" />
                  <span>AI Architect</span>
                </>
              )}
            </div>

            <div
              className={`p-3 rounded-xl text-xs leading-relaxed max-w-[95%] ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none shadow-sm'
                  : 'bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-bl-none shadow-sm'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {/* Proposed Schema Patch Card */}
              {msg.proposedPatch && msg.proposedPatch.schemaSnapshot && msg.proposedPatch.summary !== 'SQL Design Advisory' && (
                <div className="mt-2.5 p-2.5 bg-[#0B0F19] rounded-lg border border-purple-500/40 text-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-purple-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      {msg.proposedPatch.summary}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {msg.proposedPatch.schemaSnapshot.tables.length} tables
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      if (msg.proposedPatch?.schemaSnapshot) {
                        onApplySchemaUpdate(msg.proposedPatch.schemaSnapshot);
                      }
                    }}
                    className="w-full mt-2 py-1.5 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply Changes to Canvas</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-xl border border-slate-700 text-slate-400 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" />
            <span>AI is reasoning over schema relations...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice Status Pill */}
      {isListening && (
        <div className="px-3 py-1.5 bg-purple-950/80 border-t border-purple-800/80 flex items-center justify-between text-xs text-purple-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            <span>Listening... speak your schema request</span>
          </div>
          <button
            onClick={toggleListening}
            className="text-[10px] underline hover:text-white"
          >
            Done
          </button>
        </div>
      )}

      {/* Input Form with Voice Button */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/60">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-1.5"
        >
          {speechSupported && (
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2 rounded-lg transition-colors ${
                isListening
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 border border-slate-700'
              }`}
              title={isListening ? 'Stop Listening' : 'Voice Dictation'}
            >
              {isListening ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4" />}
            </button>
          )}

          <input
            type="text"
            placeholder={isListening ? 'Listening to speech...' : 'Ask about SQL design, dialect compatibility, or schema changes...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1 bg-[#131B2E] text-slate-100 placeholder-slate-500 text-xs px-3 py-2 rounded-lg border border-slate-700/80 focus:outline-none focus:border-purple-500 transition-colors"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 text-white rounded-lg transition-colors shadow-sm"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="mt-1.5 text-[10px] text-slate-500 flex items-center justify-between">
          <span>Click mic to speak · Press Enter to submit</span>
        </div>
      </div>
    </aside>
  );
};

interface FallbackResult {
  explanation: string;
  summary: string;
  updatedSchema?: SchemaModel;
}

// Client-side fallback if server API is unavailable or offline
function handleOfflineFallback(prompt: string, currentSchema: SchemaModel): FallbackResult {
  const lower = prompt.toLowerCase();

  // 1. Check for out-of-scope requests
  const isOutOfScope = /python|javascript|react component|write a poem|weather|css style|scrape|backend api|express route|html|frontend/i.test(lower);
  if (isOutOfScope) {
    return {
      explanation: `I am specialized in database schema architecture, entity relationship modeling, and SQL dialect compatibility within RelationalCanvas.

I cannot assist with general software programming, server scripting, or non-database tasks. However, I am ready to help you model tables, define relationships, optimize indexes, or ensure cross-dialect compatibility across PostgreSQL, MSSQL, MySQL, SQLite, DBML, and Mermaid!`,
      summary: 'Out of Scope',
    };
  }

  // 2. Check for SQL Design Advisory / Informational questions
  const isAdvisory = /difference|compare|vs|trade-?off|how to|what is|why|explain|which type|normalize|normalization|indexing|performance|best practice/i.test(lower);
  if (isAdvisory) {
    let text = '';
    if (lower.includes('uniqueidentifier') || lower.includes('uuid')) {
      text = `### UNIQUEIDENTIFIER (MSSQL) vs. UUID (PostgreSQL)

- **Microsoft SQL Server (\`UNIQUEIDENTIFIER\`)**:
  - 16-byte binary GUID storage. Generated via \`NEWID()\` (random) or \`NEWSEQUENTIALID()\` (sequential).
  - *Clustered Index Tip*: Avoid random \`NEWID()\` as a clustered primary key to prevent index page splits and fragmentation; use \`NEWSEQUENTIALID()\` or an \`IDENTITY(1,1)\` surrogate key instead.
- **PostgreSQL (\`UUID\`)**:
  - Native 128-bit type. Generated via \`gen_random_uuid()\`.
  - Highly optimized for B-tree index lookups and UUIDv7 chronological ordering.
- **Cross-Dialect Translation**:
  - RelationalCanvas automatically maps \`UUID\` (PostgreSQL) ↔ \`UNIQUEIDENTIFIER\` (MSSQL) when switching dialects.`;
    } else if (lower.includes('normalize') || lower.includes('3nf')) {
      text = `### Database Normalization Principles (1NF – 3NF)

1. **First Normal Form (1NF)**: Eliminate repeating groups; ensure atomic column values and a distinct primary key for each row.
2. **Second Normal Form (2NF)**: Satisfy 1NF and ensure all non-key columns fully depend on the complete primary key (no partial key dependencies).
3. **Third Normal Form (3NF)**: Satisfy 2NF and eliminate transitive dependencies (non-key columns must depend *only* on the primary key).
4. **RelationalCanvas Recommendation**: Break entities into dedicated cards linked with foreign keys, and use junction tables for \`N:M\` relationships.`;
    } else {
      text = `### Relational Schema Design Guidance

- **Primary Keys**: Always enforce a clear unique identifier (\`UUID\` / \`UNIQUEIDENTIFIER\` or compact auto-increment integers).
- **Referential Integrity**: Define explicit \`FOREIGN KEY\` relationships with cascade rules to protect against orphaned rows.
- **Cross-Dialect Types**: Use engine-native types (e.g. \`NVARCHAR\` in MSSQL for Unicode vs \`VARCHAR\` in PostgreSQL; \`DATETIME2\` in MSSQL vs \`TIMESTAMPTZ\` in PostgreSQL).`;
    }

    return {
      explanation: text,
      summary: 'SQL Design Advisory',
    };
  }

  // 3. Schema Mutations
  const tables = [...currentSchema.tables];
  const relationships = [...currentSchema.relationships];

  if (lower.includes('audit')) {
    const auditId = `tbl_audit_log_${Math.random().toString(36).substring(2, 6)}`;
    const newTable = {
      id: auditId,
      name: 'audit_logs',
      position: { x: 60, y: (tables.length > 0 ? Math.max(...tables.map(t => t.position.y)) + 280 : 300) },
      colorHeader: '#F59E0B',
      columns: [
        { id: 'al_id', name: 'id', type: currentSchema.dialect === 'mssql' ? 'uniqueidentifier' : 'uuid', isPrimaryKey: true, isForeignKey: false, isNullable: false, isUnique: true, defaultValue: currentSchema.dialect === 'mssql' ? 'NEWID()' : 'gen_random_uuid()' },
        { id: 'al_table', name: 'table_name', type: currentSchema.dialect === 'mssql' ? 'nvarchar(100)' : 'varchar(100)', isPrimaryKey: false, isForeignKey: false, isNullable: false, isUnique: false },
        { id: 'al_action', name: 'action', type: currentSchema.dialect === 'mssql' ? 'nvarchar(50)' : 'varchar(50)', isPrimaryKey: false, isForeignKey: false, isNullable: false, isUnique: false },
        { id: 'al_user', name: 'performed_by', type: currentSchema.dialect === 'mssql' ? 'nvarchar(120)' : 'varchar(120)', isPrimaryKey: false, isForeignKey: false, isNullable: true, isUnique: false },
        { id: 'al_time', name: 'created_at', type: currentSchema.dialect === 'mssql' ? 'datetime2' : 'timestamptz', isPrimaryKey: false, isForeignKey: false, isNullable: false, isUnique: false, defaultValue: currentSchema.dialect === 'mssql' ? 'SYSUTCDATETIME()' : 'NOW()' },
      ],
    };
    tables.push(newTable);
    return {
      explanation: 'Added an `audit_logs` entity tracking table changes, actions, user identifiers, and timestamps.',
      summary: 'Added audit_logs entity',
      updatedSchema: { ...currentSchema, tables, relationships, updatedAt: Date.now() },
    };
  } else if (lower.includes('address')) {
    const addrId = `tbl_addresses_${Math.random().toString(36).substring(2, 6)}`;
    const userTable = tables.find(t => t.name.toLowerCase().includes('user')) || tables[0];
    const newTable = {
      id: addrId,
      name: 'addresses',
      position: { x: (userTable?.position.x || 100) + 380, y: (userTable?.position.y || 100) },
      colorHeader: '#06B6D4',
      columns: [
        { id: 'ad_id', name: 'id', type: currentSchema.dialect === 'mssql' ? 'uniqueidentifier' : 'uuid', isPrimaryKey: true, isForeignKey: false, isNullable: false, isUnique: true, defaultValue: currentSchema.dialect === 'mssql' ? 'NEWID()' : 'gen_random_uuid()' },
        { id: 'ad_user_id', name: userTable ? `${userTable.name}_id` : 'user_id', type: currentSchema.dialect === 'mssql' ? 'uniqueidentifier' : 'uuid', isPrimaryKey: false, isForeignKey: true, isNullable: false, isUnique: false, references: userTable ? { targetTableId: userTable.id, targetColumnId: userTable.columns[0]?.id } : undefined },
        { id: 'ad_street', name: 'street_address', type: currentSchema.dialect === 'mssql' ? 'nvarchar(255)' : 'varchar(255)', isPrimaryKey: false, isForeignKey: false, isNullable: false, isUnique: false },
        { id: 'ad_city', name: 'city', type: currentSchema.dialect === 'mssql' ? 'nvarchar(100)' : 'varchar(100)', isPrimaryKey: false, isForeignKey: false, isNullable: false, isUnique: false },
        { id: 'ad_zip', name: 'postal_code', type: currentSchema.dialect === 'mssql' ? 'nvarchar(20)' : 'varchar(20)', isPrimaryKey: false, isForeignKey: false, isNullable: false, isUnique: false },
      ],
    };
    tables.push(newTable);
    if (userTable && userTable.columns[0]) {
      relationships.push({
        id: `rel_addr_${Date.now()}`,
        sourceTableId: addrId,
        sourceColumnId: 'ad_user_id',
        targetTableId: userTable.id,
        targetColumnId: userTable.columns[0].id,
        cardinality: '1:N',
        name: `fk_addresses_${userTable.name}`,
      });
    }
    return {
      explanation: `Added \`addresses\` table linked via foreign key to \`${userTable?.name || 'parent'}\`.`,
      summary: 'Added addresses entity with foreign key',
      updatedSchema: { ...currentSchema, tables, relationships, updatedAt: Date.now() },
    };
  } else {
    const newId = `tbl_entity_${Math.random().toString(36).substring(2, 6)}`;
    const newTable = {
      id: newId,
      name: `entity_${tables.length + 1}`,
      position: { x: 300, y: 300 },
      colorHeader: '#8B5CF6',
      columns: [
        { id: 'cs_id', name: 'id', type: currentSchema.dialect === 'mssql' ? 'uniqueidentifier' : 'uuid', isPrimaryKey: true, isForeignKey: false, isNullable: false, isUnique: true, defaultValue: currentSchema.dialect === 'mssql' ? 'NEWID()' : 'gen_random_uuid()' },
        { id: 'cs_name', name: 'name', type: currentSchema.dialect === 'mssql' ? 'nvarchar(255)' : 'varchar(255)', isPrimaryKey: false, isForeignKey: false, isNullable: false, isUnique: false },
        { id: 'cs_date', name: 'created_at', type: currentSchema.dialect === 'mssql' ? 'datetime2' : 'timestamptz', isPrimaryKey: false, isForeignKey: false, isNullable: false, isUnique: false },
      ],
    };
    tables.push(newTable);
    return {
      explanation: `Created new entity table for \`${prompt}\`.`,
      summary: `Added entity_${tables.length}`,
      updatedSchema: { ...currentSchema, tables, relationships, updatedAt: Date.now() },
    };
  }
}
