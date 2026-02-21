import { useState, useEffect, useRef } from 'react'
import { Server, Settings, Plus, Trash2, Download, X, Search, Globe, Database, Code, Terminal, Upload, Eye, EyeOff, Layout, ListChecks, CheckCircle2, RefreshCw, FolderOpen } from 'lucide-react'
import './App.css'

interface McpServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

interface McpConfig {
  mcpServers: Record<string, McpServerConfig>;
}

interface ServerTemplate {
  name: string;
  description: string;
  command: string;
  args: string[];
  icon: React.ReactNode;
  envKeys: string[];
  isCommunity?: boolean;
}

interface Preset {
  id: string;
  name: string;
  description: string;
  servers: Record<string, McpServerConfig>;
  icon: React.ReactNode;
}

declare global {
  interface Window {
    electronAPI?: {
      loadConfig: (client: string) => Promise<any>;
      saveConfig: (client: string, config: any) => Promise<{ success?: boolean; error?: string }>;
      discoverConfigs: () => Promise<Record<string, any>>;
      openConfigFolder: (client: string) => void;
      isNative: boolean;
    };
  }
}

function App() {
  const [servers, setServers] = useState<Record<string, McpServerConfig>>({});
  const [activeServer, setActiveServer] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [communityServers, setCommunityServers] = useState<ServerTemplate[]>([]);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(false);
  const [maskSecrets, setMaskSecrets] = useState(true);
  const [exportFormat, setExportFormat] = useState<'generic' | 'claude' | 'gemini' | 'cursor'>('generic');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isNative = !!window.electronAPI?.isNative;

  useEffect(() => {
    if (isNative) {
      const initLoad = async () => {
        const config = await window.electronAPI?.loadConfig('claude');
        if (config && config.mcpServers) {
          setServers(config.mcpServers);
          if (Object.keys(config.mcpServers).length > 0) {
            setActiveServer(Object.keys(config.mcpServers)[0]);
          }
        }
      };
      initLoad();
    }
  }, [isNative]);

  const syncToNative = async () => {
    if (!isNative) return;
    setIsSyncing(true);
    setLastSyncStatus(null);
    try {
      const result = await window.electronAPI?.saveConfig(exportFormat === 'generic' ? 'claude' : exportFormat, { mcpServers: servers });
      if (result?.success) {
        setLastSyncStatus('Saved successfully');
        setTimeout(() => setLastSyncStatus(null), 3000);
      } else {
        setLastSyncStatus(`Error: ${result?.error}`);
      }
    } catch (err) {
      setLastSyncStatus('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDiscovery = async () => {
    if (!isNative) return;
    try {
      const results = await window.electronAPI?.discoverConfigs();
      if (results) {
        let mergedServers = { ...servers };
        let foundNew = false;

        Object.keys(results).forEach(client => {
          const config = results[client];
          if (config && config.mcpServers) {
            Object.keys(config.mcpServers).forEach(serverName => {
              if (!mergedServers[serverName]) {
                mergedServers[serverName] = config.mcpServers[serverName];
                foundNew = true;
              }
            });
          }
        });

        if (foundNew) {
          setServers(mergedServers);
          setLastSyncStatus('Discovered and merged new servers');
          setTimeout(() => setLastSyncStatus(null), 3000);
        } else {
          setLastSyncStatus('No new servers found');
          setTimeout(() => setLastSyncStatus(null), 3000);
        }
      }
    } catch (err) {
      console.error('Discovery failed', err);
    }
  };

  const presets: Preset[] = [
    {
      id: 'web-dev',
      name: 'Web Developer',
      description: 'GitHub, Postgres, and Brave Search for full-stack workflows.',
      icon: <Globe size={24} />,
      servers: {
        'github': { command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'], env: { GITHUB_PERSONAL_ACCESS_TOKEN: '' } },
        'postgres': { command: 'npx', args: ['-y', '@modelcontextprotocol/server-postgres', 'postgresql://localhost/mydb'] },
        'brave-search': { command: 'npx', args: ['-y', '@modelcontextprotocol/server-brave-search'], env: { BRAVE_API_KEY: '' } }
      }
    },
    {
      id: 'data-science',
      name: 'Data Scientist',
      description: 'SQLite, Google Sheets, and Local Filesystem for data workflows.',
      icon: <Database size={24} />,
      servers: {
        'sqlite': { command: 'uvx', args: ['mcp-server-sqlite', '--db-path', '~/data.db'] },
        'google-sheets': { command: 'npx', args: ['-y', '@modelcontextprotocol/server-google-sheets'] },
        'filesystem': { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '/Users/username/data'] }
      }
    },
    {
      id: 'security',
      name: 'Security Researcher',
      description: 'Search tools and system utilities for security analysis.',
      icon: <Terminal size={24} />,
      servers: {
        'shodan': { command: 'npx', args: ['-y', '@modelcontextprotocol/server-shodan'], env: { SHODAN_API_KEY: '' } },
        'whois': { command: 'npx', args: ['-y', '@modelcontextprotocol/server-whois'] },
        'brave-search': { command: 'npx', args: ['-y', '@modelcontextprotocol/server-brave-search'], env: { BRAVE_API_KEY: '' } }
      }
    }
  ];

  // Extended list of pre-configured servers based on awesome-mcp-servers
  const preconfiguredServers: ServerTemplate[] = [
    {
      name: 'github',
      description: 'Interact with GitHub API, read repos, manage PRs and issues',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      icon: <Code size={24} />,
      envKeys: ['GITHUB_PERSONAL_ACCESS_TOKEN']
    },
    {
      name: 'postgres',
      description: 'Connect to and query PostgreSQL databases',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-postgres', 'postgresql://localhost/mydb'],
      icon: <Database size={24} />,
      envKeys: []
    },
    {
      name: 'sqlite',
      description: 'Interact with local SQLite databases',
      command: 'uvx',
      args: ['mcp-server-sqlite', '--db-path', '~/test.db'],
      icon: <Database size={24} />,
      envKeys: []
    },
    {
      name: 'brave-search',
      description: 'Web search using Brave Search API',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-brave-search'],
      icon: <Globe size={24} />,
      envKeys: ['BRAVE_API_KEY']
    },
    {
      name: 'filesystem',
      description: 'Read and write to the local filesystem',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/Users/username/Desktop'],
      icon: <Terminal size={24} />,
      envKeys: []
    },
    {
      name: 'slack',
      description: 'Interact with Slack channels and messages',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-slack'],
      icon: <Code size={24} />,
      envKeys: ['SLACK_BOT_TOKEN', 'SLACK_TEAM_ID']
    },
    {
      name: 'custom',
      description: 'Start from scratch with an empty configuration',
      command: '',
      args: [],
      icon: <Settings size={24} />,
      envKeys: []
    }
  ];

  // Fetch awesome-mcp-servers dynamically
  useEffect(() => {
    const fetchCommunityServers = async () => {
      if (isModalOpen && communityServers.length === 0 && !isLoadingCommunity) {
        setIsLoadingCommunity(true);
        try {
          const res = await fetch('https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/README.md');
          const text = await res.text();

          const regex = /- \[([^\]]+)\]\(([^)]+)\)[^-]+-\s*(.*)/g;
          const parsed: ServerTemplate[] = [];

          let match;
          while ((match = regex.exec(text)) !== null) {
            const fullName = match[1];
            const url = match[2];
            const desc = match[3] || 'Community Server';
            const shortName = fullName.includes('/') ? fullName.split('/')[1] : fullName;

            if (url.includes('github') && parsed.length < 50) {
              parsed.push({
                name: shortName,
                description: desc.substring(0, 80) + (desc.length > 80 ? '...' : ''),
                command: 'npx',
                args: ['-y', `@${fullName}`],
                icon: <Server size={24} />,
                envKeys: [],
                isCommunity: true
              });
            }
          }

          const glamaServers: ServerTemplate[] = [
            {
              name: 'raycast-mcp',
              description: 'Raycast MCP Server (via Glama)',
              command: 'npx',
              args: ['-y', '@raycast/mcp-server'],
              icon: <Globe size={24} />,
              envKeys: [],
              isCommunity: true
            },
            {
              name: 'linear-mcp',
              description: 'Linear Issue Tracker (via Glama)',
              command: 'npx',
              args: ['-y', '@linear/mcp-server'],
              icon: <Code size={24} />,
              envKeys: ['LINEAR_API_KEY'],
              isCommunity: true
            }
          ];

          const combined = [...glamaServers, ...parsed];
          const finalCommunity = combined.filter((p, index, self) =>
            index === self.findIndex((t) => (
              t.name === p.name
            )) && !preconfiguredServers.find(ps => ps.name.includes(p.name) || p.name.includes(ps.name))
          );

          setCommunityServers(finalCommunity);
        } catch (err) {
          console.error('Failed to fetch community servers', err);
        } finally {
          setIsLoadingCommunity(false);
        }
      }
    };

    fetchCommunityServers();
  }, [isModalOpen, communityServers.length, isLoadingCommunity]);

  const handleAddServer = (template: ServerTemplate) => {
    let serverName = template.name;
    let counter = 1;
    while (servers[serverName]) {
      serverName = `${template.name}-${counter}`;
      counter++;
    }

    const envObj: Record<string, string> = {};
    template.envKeys.forEach(key => {
      envObj[key] = '';
    });

    setServers(prev => ({
      ...prev,
      [serverName]: {
        command: template.command,
        args: [...template.args],
        env: template.envKeys.length > 0 ? envObj : undefined
      }
    }));

    setActiveServer(serverName);
    setIsModalOpen(false);
    setSearchQuery('');
  };

  const applyPreset = (preset: Preset) => {
    setServers(prev => ({ ...prev, ...preset.servers }));
    if (!activeServer) {
      setActiveServer(Object.keys(preset.servers)[0]);
    }
    setIsPresetModalOpen(false);
  };

  const handleRemoveServer = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newServers = { ...servers };
    delete newServers[name];
    setServers(newServers);
    if (activeServer === name) {
      setActiveServer(Object.keys(newServers)[0] || null);
    }
  };

  const updateServer = (name: string, updates: Partial<McpServerConfig>) => {
    setServers(prev => ({
      ...prev,
      [name]: { ...prev[name], ...updates }
    }));
  };

  const updateServerName = (oldName: string, newName: string) => {
    if (oldName === newName || !newName.trim() || servers[newName]) return;

    setServers(prev => {
      const updated = { ...prev };
      updated[newName] = updated[oldName];
      delete updated[oldName];
      return updated;
    });

    if (activeServer === oldName) {
      setActiveServer(newName);
    }
  };

  const addArg = (name: string) => {
    const server = servers[name];
    updateServer(name, { args: [...server.args, ''] });
  };

  const updateArg = (name: string, index: number, value: string) => {
    const server = servers[name];
    const newArgs = [...server.args];
    newArgs[index] = value;
    updateServer(name, { args: newArgs });
  };

  const removeArg = (name: string, index: number) => {
    const server = servers[name];
    const newArgs = server.args.filter((_, i) => i !== index);
    updateServer(name, { args: newArgs });
  };

  const addEnv = (name: string) => {
    const server = servers[name];
    const newEnv = { ...(server.env || {}), ['NEW_VAR']: '' };
    updateServer(name, { env: newEnv });
  };

  const addCommonEnv = (name: string) => {
    const commonEnv = {
      PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
      HOME: '/Users/username',
      USER: 'username'
    };
    const server = servers[name];
    const newEnv = { ...(server.env || {}), ...commonEnv };
    updateServer(name, { env: newEnv });
  };

  const updateEnvKey = (name: string, oldKey: string, newKey: string) => {
    if (oldKey === newKey) return;
    const server = servers[name];
    const newEnv = { ...server.env };
    newEnv[newKey] = newEnv[oldKey];
    delete newEnv[oldKey];
    updateServer(name, { env: newEnv });
  };

  const updateEnvVal = (name: string, key: string, val: string) => {
    const server = servers[name];
    updateServer(name, { env: { ...server.env, [key]: val } });
  };

  const removeEnv = (name: string, key: string) => {
    const server = servers[name];
    const newEnv = { ...server.env };
    delete newEnv[key];
    if (Object.keys(newEnv).length === 0) {
      updateServer(name, { env: undefined });
    } else {
      updateServer(name, { env: newEnv });
    }
  };

  const exportConfig = () => {
    const config: McpConfig = { mcpServers: servers };
    let filename = 'mcp_config.json';
    if (exportFormat === 'claude') filename = 'claude_desktop_config.json';
    if (exportFormat === 'gemini') filename = 'gemini_settings.json';
    if (exportFormat === 'cursor') filename = 'mcpServers.json';

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string) as McpConfig;
        if (json.mcpServers) {
          setServers(prev => ({ ...prev, ...json.mcpServers }));
          setActiveServer(Object.keys(json.mcpServers)[0] || null);
        } else {
          alert("Invalid MCP configuration file layout.");
        }
      } catch (err) {
        alert("Could not parse JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const allServers = [...preconfiguredServers, ...communityServers];
  const filteredServers = allServers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <Server className="logo-icon" />
          <div className="sidebar-title">
            <h2>MCP Config</h2>
            <span className="badge-pro">GUI</span>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".json"
            style={{ display: 'none' }}
          />
          <button
            className="icon-btn"
            style={{ marginLeft: 'auto' }}
            title="Import configuration"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={16} />
          </button>
        </div>

        <div className="sidebar-nav">
          <button
            className={`nav-item ${!isPresetModalOpen ? 'active' : ''}`}
            onClick={() => setIsPresetModalOpen(false)}
          >
            <ListChecks size={18} />
            <span>My Servers</span>
          </button>
          <button
            className={`nav-item ${isPresetModalOpen ? 'active' : ''}`}
            onClick={() => setIsPresetModalOpen(true)}
          >
            <Layout size={18} />
            <span>Presets</span>
          </button>

          {isNative && (
            <div className="native-actions" style={{ marginTop: 'auto', padding: '12px 0 0' }}>
              <button
                className={`primary-btn w-full ${isSyncing ? 'loading' : ''}`}
                onClick={syncToNative}
                disabled={isSyncing}
                style={{ gap: '8px' }}
              >
                <RefreshCw size={16} className={isSyncing ? 'spin' : ''} />
                {isSyncing ? 'Syncing...' : 'Sync to Native'}
              </button>
              {lastSyncStatus && (
                <p className="sync-status" style={{
                  textAlign: 'center',
                  fontSize: '11px',
                  marginTop: '8px',
                  color: lastSyncStatus.includes('Error') ? 'var(--danger)' : 'var(--success)'
                }}>
                  {lastSyncStatus}
                </p>
              )}
              <button
                className="ghost-btn w-full"
                style={{ marginTop: '8px', gap: '8px', fontSize: '12px' }}
                onClick={() => window.electronAPI?.openConfigFolder(exportFormat === 'generic' ? 'claude' : exportFormat)}
              >
                <FolderOpen size={16} />
                Open Config Folder
              </button>
              <button
                className="ghost-btn w-full mt-8"
                style={{ gap: '8px', fontSize: '12px', border: '1px solid var(--border-color)' }}
                onClick={handleDiscovery}
              >
                <Search size={16} />
                Smart Discovery
              </button>
            </div>
          )}
        </div>

        <div className="server-list">
          {Object.keys(servers).length === 0 ? (
            <div className="empty-state-sidebar">No servers configured</div>
          ) : (
            Object.keys(servers).map(name => (
              <div
                key={name}
                className={`server-item ${activeServer === name && !isPresetModalOpen ? 'active' : ''}`}
                onClick={() => {
                  setActiveServer(name);
                  setIsPresetModalOpen(false);
                }}
              >
                <div className="server-item-name">
                  <Settings size={16} />
                  <span>{name}</span>
                </div>
                <button
                  className="icon-btn danger-hover"
                  onClick={(e) => handleRemoveServer(name, e)}
                  title="Remove server"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="sidebar-footer">
          <button className="add-btn" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> Add Server
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {isPresetModalOpen ? (
          <div className="preset-view">
            <div className="editor-header">
              <h1>Configuration Presets</h1>
              <p className="text-muted">Start quickly with pre-defined sets of MCP servers for specific workflows.</p>
            </div>
            <div className="preset-grid">
              {presets.map(preset => (
                <div key={preset.id} className="preset-card">
                  <div className="preset-card-header">
                    <div className="preset-icon">{preset.icon}</div>
                    <div className="preset-info">
                      <h3>{preset.name}</h3>
                      <p>{preset.description}</p>
                    </div>
                  </div>
                  <div className="preset-servers">
                    {Object.keys(preset.servers).map(s => (
                      <span key={s} className="preset-server-badge">{s}</span>
                    ))}
                  </div>
                  <button className="primary-btn w-full mt-16" onClick={() => applyPreset(preset)}>
                    Apply Preset
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : activeServer && servers[activeServer] ? (
          <div className="config-editor">
            <div className="editor-header">
              <div className="header-top">
                <div className="header-title-edit">
                  <h1>Configuring:</h1>
                  <input
                    type="text"
                    className="server-name-input highlight"
                    value={activeServer}
                    onChange={(e) => updateServerName(activeServer, e.target.value)}
                    onBlur={(e) => updateServerName(activeServer, e.target.value)}
                    title="Click to rename server"
                  />
                </div>
                <div className="header-actions">
                  <button
                    className="ghost-btn danger-hover"
                    style={{ padding: '6px 12px', borderRadius: '6px' }}
                    onClick={(e) => handleRemoveServer(activeServer, e)}
                  >
                    <Trash2 size={16} style={{ marginRight: '6px' }} /> Delete
                  </button>
                </div>
              </div>
              <div className="server-health">
                <CheckCircle2 size={14} className="success-icon" />
                <span>Configuration Valid</span>
              </div>
            </div>

            <div className="form-group">
              <label>Command <span className="label-hint">(Binary or script to run)</span></label>
              <input
                type="text"
                value={servers[activeServer].command}
                onChange={(e) => updateServer(activeServer, { command: e.target.value })}
                placeholder="e.g., npx, docker, python, uvx"
              />
            </div>

            <div className="form-section">
              <div className="section-header">
                <label>Arguments</label>
                <button className="icon-btn-text" onClick={() => addArg(activeServer)}>
                  <Plus size={14} /> Add
                </button>
              </div>
              <div className="args-list">
                {servers[activeServer].args.map((arg, index) => (
                  <div key={index} className="arg-row">
                    <span className="arg-index">{index}</span>
                    <input
                      type="text"
                      value={arg}
                      onChange={(e) => updateArg(activeServer, index, e.target.value)}
                      placeholder={`Argument ${index + 1}`}
                    />
                    <button className="icon-btn danger" onClick={() => removeArg(activeServer, index)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {servers[activeServer].args.length === 0 && (
                  <div className="empty-list">No arguments defined</div>
                )}
              </div>
            </div>

            <div className="form-section">
              <div className="section-header">
                <label>Environment Variables</label>
                <div className="section-actions">
                  <button className="ghost-btn sm" onClick={() => addCommonEnv(activeServer)}>
                    <Plus size={14} style={{ marginRight: '4px' }} /> Add Standard
                  </button>
                  <button className="icon-btn-text" onClick={() => addEnv(activeServer)}>
                    <Plus size={14} /> Add Custom
                  </button>
                </div>
              </div>
              <div className="env-list">
                {Object.entries(servers[activeServer].env || {}).map(([key, val], index) => (
                  <div key={index} className="env-row">
                    <input
                      type="text"
                      className="env-key"
                      value={key}
                      onChange={(e) => updateEnvKey(activeServer, key, e.target.value)}
                      placeholder="KEY"
                    />
                    <span className="equals">=</span>
                    <div className="env-val-wrapper">
                      <input
                        type={maskSecrets ? "password" : "text"}
                        className="env-val"
                        value={val}
                        onChange={(e) => updateEnvVal(activeServer, key, e.target.value)}
                        placeholder="Value"
                      />
                      <button className="mask-btn" onClick={() => setMaskSecrets(!maskSecrets)}>
                        {maskSecrets ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                    </div>
                    <button className="icon-btn danger" onClick={() => removeEnv(activeServer, key)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {(!servers[activeServer].env || Object.keys(servers[activeServer].env!).length === 0) && (
                  <div className="empty-list">No environment variables defined</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state-main">
            <Server size={64} className="muted-icon" />
            <h2>Universal MCP Manager</h2>
            <p>Select a server, import a config, or use a preset to get started.</p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button className="primary-btn mt-24" onClick={() => setIsModalOpen(true)}>
                <Plus size={16} style={{ marginRight: '8px' }} /> Add Server
              </button>
              <button className="ghost-btn mt-24" style={{ border: '1px solid var(--border-color)' }} onClick={() => setIsPresetModalOpen(true)}>
                <Layout size={16} style={{ marginRight: '8px' }} /> View Presets
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Pane */}
      <div className="preview-pane">
        <div className="preview-header">
          <h3>Generated Config</h3>
          <div className="format-selector">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as any)}
              className="export-select"
            >
              <option value="generic">Standard (mcp_config.json)</option>
              <option value="claude">Claude Desktop</option>
              <option value="gemini">Gemini Sidekick</option>
              <option value="cursor">Cursor AI</option>
            </select>
            <button className="primary-btn" onClick={exportConfig} disabled={Object.keys(servers).length === 0}>
              <Download size={14} />
            </button>
          </div>
        </div>
        <div className="code-block">
          <div className="format-info">
            {exportFormat === 'claude' && <span className="path-hint">~/.claude_desktop_config.json</span>}
            {exportFormat === 'gemini' && <span className="path-hint">~/.gemini/settings.json</span>}
            {exportFormat === 'cursor' && <span className="path-hint">Cursor global storage path</span>}
            {exportFormat === 'generic' && <span className="path-hint">Generic MCP Schema</span>}
          </div>
          <pre>{JSON.stringify({ mcpServers: servers }, null, 2)}</pre>
        </div>
      </div>

      {/* Add Server Pre-configured Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Browse Servers</h2>
              <button className="icon-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-search">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search community catalog..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="modal-body preconfigured-grid">
              {filteredServers.map((server, idx) => (
                <div
                  key={server.name + idx}
                  className={`preconfig-card ${server.isCommunity ? 'community-card' : ''}`}
                  onClick={() => handleAddServer(server)}
                >
                  <div className="preconfig-icon">
                    {server.icon}
                  </div>
                  <div className="preconfig-info">
                    <h3>
                      {server.name}
                      {server.isCommunity && <span className="community-badge">Community</span>}
                    </h3>
                    <p>{server.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p className="text-muted text-sm">
                Powered by <a href="https://github.com/punkpeye/awesome-mcp-servers" target="_blank" rel="noreferrer" className="text-accent">Awesome MCP</a>
              </p>
              {isLoadingCommunity && <p className="text-accent text-sm">Updating database...</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
