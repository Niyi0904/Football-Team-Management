// app/api/mcp/route.ts
// MCP server endpoint using Streamable HTTP transport.
// Handles GET for SSE-style init and POST for tool calls.
// Every tool delegates to the same core lib/ai-access.ts functions.

import { NextRequest, NextResponse } from 'next/server';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  checkApiKey,
  getLeagueSummary,
  getStandings,
  getRecentResults,
  getUpcomingFixtures,
  getTopScorers,
  getTeamRoster,
} from '@/lib/ai-access';

export const runtime = 'nodejs';

// ─────────────────────────────────────────────
// MCP Server setup (lightweight, one per request)
// ─────────────────────────────────────────────

function createMcpServer() {
  const server = new Server(
    { name: 'kickoff-ai-access', version: '1.0.0' },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // ── List tools ─────────────────────────────
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'get_league_summary',
        description:
          'Returns a summary of the league including name, season, team count, and player count. Requires a leagueId parameter.',
        inputSchema: {
          type: 'object',
          properties: {
            leagueId: { type: 'string', description: 'The ID of the league (use "league" for the current league)' },
          },
          required: ['leagueId'],
        },
      },
      {
        name: 'get_standings',
        description:
          'Returns the computed standings table for the league, sorted by points with tiebreakers. Each entry includes rank, team name, games played, wins, draws, losses, goals for/against/difference, and points.',
        inputSchema: {
          type: 'object',
          properties: {
            leagueId: { type: 'string', description: 'The ID of the league' },
          },
          required: ['leagueId'],
        },
      },
      {
        name: 'get_recent_results',
        description:
          'Returns the most recent completed match results for the league, with scores and team names.',
        inputSchema: {
          type: 'object',
          properties: {
            leagueId: { type: 'string', description: 'The ID of the league' },
            limit: { type: 'number', description: 'Maximum number of results to return (default 10, max 50)' },
          },
          required: ['leagueId'],
        },
      },
      {
        name: 'get_upcoming_fixtures',
        description:
          'Returns upcoming scheduled fixtures for the league, with match day and team names.',
        inputSchema: {
          type: 'object',
          properties: {
            leagueId: { type: 'string', description: 'The ID of the league' },
            limit: { type: 'number', description: 'Maximum number of fixtures to return (default 10, max 50)' },
          },
          required: ['leagueId'],
        },
      },
      {
        name: 'get_top_scorers',
        description:
          'Returns the top goal scorers in the league, sorted by goal count descending.',
        inputSchema: {
          type: 'object',
          properties: {
            leagueId: { type: 'string', description: 'The ID of the league' },
            limit: { type: 'number', description: 'Maximum number of scorers to return (default 10, max 50)' },
          },
          required: ['leagueId'],
        },
      },
      {
        name: 'get_team_roster',
        description:
          'Returns the player roster for a specific team, including player name, position, number, and manager status.',
        inputSchema: {
          type: 'object',
          properties: {
            leagueId: { type: 'string', description: 'The ID of the league' },
            teamId: { type: 'string', description: 'The ID of the team' },
          },
          required: ['leagueId', 'teamId'],
        },
      },
    ],
  }));

  // ── Call tool ──────────────────────────────
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (!args || typeof args !== 'object') {
      return {
        content: [{ type: 'text', text: 'Missing or invalid arguments.' }],
        isError: true,
      };
    }

    const leagueId = (args as Record<string, unknown>).leagueId as string | undefined;

    if (!leagueId) {
      return {
        content: [{ type: 'text', text: 'leagueId is required.' }],
        isError: true,
      };
    }

    try {
      switch (name) {
        case 'get_league_summary': {
          const result = await getLeagueSummary(leagueId);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'get_standings': {
          const result = await getStandings(leagueId);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'get_recent_results': {
          const limit = Math.min(Math.max((args as any).limit ?? 10, 1), 50);
          const result = await getRecentResults(leagueId, limit);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'get_upcoming_fixtures': {
          const limit = Math.min(Math.max((args as any).limit ?? 10, 1), 50);
          const result = await getUpcomingFixtures(leagueId, limit);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'get_top_scorers': {
          const limit = Math.min(Math.max((args as any).limit ?? 10, 1), 50);
          const result = await getTopScorers(leagueId, limit);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'get_team_roster': {
          const teamId = (args as Record<string, unknown>).teamId as string | undefined;
          if (!teamId) {
            return {
              content: [{ type: 'text', text: 'teamId is required.' }],
              isError: true,
            };
          }
          const result = await getTeamRoster(leagueId, teamId);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (err: any) {
      const message = err?.message ?? 'Internal error.';
      return {
        content: [{ type: 'text', text: message }],
        isError: true,
      };
    }
  });

  return server;
}

// ─────────────────────────────────────────────
// API key check helper for MCP
// ─────────────────────────────────────────────

function checkAuth(request: NextRequest): void {
  const authHeader = request.headers.get('Authorization');
  checkApiKey(authHeader);
}

// ─────────────────────────────────────────────
// GET — MCP Streamable HTTP initialisation
// Returns protocol metadata so MCP clients can discover capabilities.
// ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    checkAuth(request);

    const server = createMcpServer();

    // Simulate a ListTools request to get the capability list,
    // then return it in a JSON format MCP clients expect.
    // MCP Streamable HTTP: GET returns protocol metadata.
    const response = {
      protocol: '2025-03-26',
      serverInfo: { name: 'kickoff-ai-access', version: '1.0.0' },
      capabilities: {
        tools: {},
      },
      streamableHttp: true,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (err: any) {
    const message = err?.message ?? 'Unauthorized.';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

// ─────────────────────────────────────────────
// POST — MCP tool invocation
// Uses MCP Streamable HTTP transport semantics:
// each request includes a JSON-RPC body that the MCP Server processes.
// ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    checkAuth(request);

    const body = await request.json();

    // Support JSON-RPC style request with method and params
    const method = body?.method;
    const params = body?.params ?? {};

    const server = createMcpServer();

    // Handle JSON-RPC methods
    if (method === 'tools/list') {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: body.id ?? 1,
          result: {
            tools: [
              {
                name: 'get_league_summary',
                description:
                  'Returns a summary of the league including name, season, team count, and player count.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    leagueId: { type: 'string', description: 'The ID of the league' },
                  },
                  required: ['leagueId'],
                },
              },
              {
                name: 'get_standings',
                description:
                  'Returns the computed standings table for the league, sorted by points.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    leagueId: { type: 'string', description: 'The ID of the league' },
                  },
                  required: ['leagueId'],
                },
              },
              {
                name: 'get_recent_results',
                description:
                  'Returns the most recent completed match results.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    leagueId: { type: 'string', description: 'The ID of the league' },
                    limit: { type: 'number', description: 'Max results (default 10)' },
                  },
                  required: ['leagueId'],
                },
              },
              {
                name: 'get_upcoming_fixtures',
                description:
                  'Returns upcoming scheduled fixtures.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    leagueId: { type: 'string', description: 'The ID of the league' },
                    limit: { type: 'number', description: 'Max fixtures (default 10)' },
                  },
                  required: ['leagueId'],
                },
              },
              {
                name: 'get_top_scorers',
                description:
                  'Returns the top goal scorers in the league.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    leagueId: { type: 'string', description: 'The ID of the league' },
                    limit: { type: 'number', description: 'Max scorers (default 10)' },
                  },
                  required: ['leagueId'],
                },
              },
              {
                name: 'get_team_roster',
                description:
                  'Returns the player roster for a specific team.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    leagueId: { type: 'string', description: 'The ID of the league' },
                    teamId: { type: 'string', description: 'The ID of the team' },
                  },
                  required: ['leagueId', 'teamId'],
                },
              },
            ],
          },
        },
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments ?? {};

      if (!toolName) {
        return NextResponse.json(
          {
            jsonrpc: '2.0',
            id: body.id ?? 1,
            error: { code: -32602, message: 'Tool name is required.' },
          },
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }

      const leagueId = toolArgs.leagueId as string | undefined;
      if (!leagueId) {
        return NextResponse.json(
          {
            jsonrpc: '2.0',
            id: body.id ?? 1,
            error: { code: -32602, message: 'leagueId is required.' },
          },
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }

      try {
        let result: unknown;

        switch (toolName) {
          case 'get_league_summary':
            result = await getLeagueSummary(leagueId);
            break;
          case 'get_standings':
            result = await getStandings(leagueId);
            break;
          case 'get_recent_results': {
            const limit = Math.min(Math.max(toolArgs.limit ?? 10, 1), 50);
            result = await getRecentResults(leagueId, limit);
            break;
          }
          case 'get_upcoming_fixtures': {
            const limit = Math.min(Math.max(toolArgs.limit ?? 10, 1), 50);
            result = await getUpcomingFixtures(leagueId, limit);
            break;
          }
          case 'get_top_scorers': {
            const limit = Math.min(Math.max(toolArgs.limit ?? 10, 1), 50);
            result = await getTopScorers(leagueId, limit);
            break;
          }
          case 'get_team_roster': {
            const teamId = toolArgs.teamId as string | undefined;
            if (!teamId) {
              return NextResponse.json(
                {
                  jsonrpc: '2.0',
                  id: body.id ?? 1,
                  error: { code: -32602, message: 'teamId is required.' },
                },
                { status: 400, headers: { 'Content-Type': 'application/json' } },
              );
            }
            result = await getTeamRoster(leagueId, teamId);
            break;
          }
          default:
            return NextResponse.json(
              {
                jsonrpc: '2.0',
                id: body.id ?? 1,
                error: { code: -32601, message: `Unknown tool: ${toolName}` },
              },
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            );
        }

        return NextResponse.json(
          {
            jsonrpc: '2.0',
            id: body.id ?? 1,
            result: {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            },
          },
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      } catch (err: any) {
        const message = err?.message ?? 'Internal error.';
        return NextResponse.json(
          {
            jsonrpc: '2.0',
            id: body.id ?? 1,
            error: { code: -32000, message },
          },
          { status: 500, headers: { 'Content-Type': 'application/json' } },
        );
      }
    }

    // Unknown JSON-RPC method
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: body.id ?? 1,
        error: { code: -32601, message: `Method not found: ${method}` },
      },
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    const message = err?.message ?? 'Internal server error.';
    if (message.includes('API key') || message.includes('Authorization')) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}