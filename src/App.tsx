import { useState, useEffect, useRef } from 'react'
import { Server, Settings, Plus, Trash2, Download, X, Search, Globe, Database, Code, Terminal, Upload } from 'lucide-react'
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

function App() {
  const [servers, setServers] = useState<Record<string, McpServerConfig>>({});
  const [activeServer, setActiveServer] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [communityServers, setCommunityServers] = useState<ServerTemplate[]>([]);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch awesome-mcp-servers dynamically, and also glama.ai
  useEffect(() => {
    const fetchCommunityServers = async () => {
      if (isModalOpen && communityServers.length === 0 && !isLoadingCommunity) {
        setIsLoadingCommunity(true);
        try {
          // 1. Fetch from awesome-mcp-servers
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

          // 2. Fetch from Glama.ai (Attempt to fetch their HTML and scrape server names if possible, but due to CORS we rely on known API patterns or just direct users there)
          // Since glama.ai might block direct CORS requests from browser, we will add a few known glama servers manually as a proof of concept, and add a link in the UI.
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

          // Deduplicate against predefined
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
    // Generate unique name if it already exists
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

  // Name updates
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
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mcp_config.json';
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
    e.target.value = ''; // Reset input
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
          <h2>MCP Config</h2>

          {/* Hidden File Input for Config Upload */}
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

        <div className="server-list">
          {Object.keys(servers).length === 0 ? (
            <div className="empty-state-sidebar">No servers configured</div>
          ) : (
            Object.keys(servers).map(name => (
              <div
                key={name}
                className={`server-item ${activeServer === name ? 'active' : ''}`}
                onClick={() => setActiveServer(name)}
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
        {activeServer && servers[activeServer] ? (
          <div className="config-editor">
            <div className="editor-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="header-title-edit">
                <h1>Configuring: </h1>
                <input
                  type="text"
                  className="server-name-input highlight"
                  value={activeServer}
                  onChange={(e) => updateServerName(activeServer, e.target.value)}
                  onBlur={(e) => updateServerName(activeServer, e.target.value)}
                  title="Click to rename server"
                />
              </div>
              <button
                className="icon-btn-text"
                style={{ color: 'var(--danger)', background: 'rgba(248, 81, 73, 0.1)', padding: '6px 12px', borderRadius: '6px' }}
                onClick={(e) => handleRemoveServer(activeServer, e)}
              >
                <Trash2 size={16} /> Delete Server
              </button>
            </div>

            <div className="form-group">
              <label>Command</label>
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
                  <Plus size={14} /> Add Arg
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
                <button className="icon-btn-text" onClick={() => addEnv(activeServer)}>
                  <Plus size={14} /> Add Env Var
                </button>
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
                    <input
                      type="text"
                      className="env-val"
                      value={val}
                      onChange={(e) => updateEnvVal(activeServer, key, e.target.value)}
                      placeholder="Value"
                    />
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
            <h2>No Server Selected</h2>
            <p>Select a server from the sidebar or add a new one to begin configuration.</p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button className="primary-btn mt-24" onClick={() => setIsModalOpen(true)}>
                <Plus size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Add New Server
              </button>
              <button className="ghost-btn mt-24" style={{ border: '1px solid var(--border-color)' }} onClick={() => fileInputRef.current?.click()}>
                <Upload size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Import Local JSON
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Pane */}
      <div className="preview-pane">
        <div className="preview-header">
          <h3>Generated Output</h3>
          <button className="primary-btn flex-center" onClick={exportConfig} disabled={Object.keys(servers).length === 0}>
            <Download size={16} style={{ marginRight: '6px' }} /> Export JSON
          </button>
        </div>
        <div className="code-block">
          <pre>{JSON.stringify({ mcpServers: servers }, null, 2)}</pre>
        </div>
      </div>

      {/* Add Server Pre-configured Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add MCP Server</h2>
              <button className="icon-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-search">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search predefined and community servers..."
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
                  <div className="preconfig-action">
                    <button className="ghost-btn sm"><Plus size={16} /></button>
                  </div>
                </div>
              ))}

              {filteredServers.length === 0 && (
                <div className="empty-list" style={{ gridColumn: '1 / -1', padding: '40px 0' }}>
                  {isLoadingCommunity ? "Loading community servers..." : `No servers found matching "${searchQuery}"`}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p className="text-muted text-sm" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                Sources:
                <a href="https://github.com/punkpeye/awesome-mcp-servers" target="_blank" rel="noreferrer" className="text-accent hover-underline">awesome-mcp-servers</a>
                <span>|</span>
                <a href="https://glama.ai/mcp/servers" target="_blank" rel="noreferrer" className="text-accent hover-underline">glama.ai</a>
                <span>|</span>
                <a href="https://www.pulsemcp.com/servers" target="_blank" rel="noreferrer" className="text-accent hover-underline">pulsemcp.com</a>
              </p>
              {isLoadingCommunity && <p className="text-accent text-sm">Fetching from awesome-list...</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
