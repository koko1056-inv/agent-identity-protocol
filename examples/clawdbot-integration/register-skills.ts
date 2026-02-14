/**
 * Clawdbot Integration Example
 * 
 * This script scans your Clawdbot skills directory and registers each skill
 * as an agent in the AIP registry.
 * 
 * Usage:
 *   AIP_REGISTRY_URL=http://localhost:3000 ts-node register-skills.ts
 */

import { AIPClient, createAgent, createCapability } from 'agent-identity-protocol';
import fs from 'fs';
import path from 'path';

// Configuration
const SKILLS_DIR = process.env.SKILLS_DIR || '/Users/kokomumatsuo/clawd/skills';
const REGISTRY_URL = process.env.AIP_REGISTRY_URL || 'http://localhost:3000';

interface SkillMetadata {
  name: string;
  description: string;
  path: string;
}

/**
 * Parse SKILL.md to extract skill metadata
 */
function parseSkillMd(skillPath: string): SkillMetadata | null {
  const skillMdPath = path.join(skillPath, 'SKILL.md');
  
  if (!fs.existsSync(skillMdPath)) {
    return null;
  }

  const content = fs.readFileSync(skillMdPath, 'utf-8');
  const lines = content.split('\n');

  // Extract frontmatter or first heading
  let name = path.basename(skillPath);
  let description = '';

  // Look for "name:" in frontmatter
  const nameMatch = content.match(/^name:\s*(.+)$/m);
  if (nameMatch) {
    name = nameMatch[1].trim();
  }

  // Look for "description:" in frontmatter
  const descMatch = content.match(/^description:\s*(.+)$/m);
  if (descMatch) {
    description = descMatch[1].trim();
  }

  // If no description in frontmatter, use first non-heading line
  if (!description) {
    for (const line of lines) {
      if (line.trim() && !line.startsWith('#') && !line.startsWith('---')) {
        description = line.trim();
        break;
      }
    }
  }

  return {
    name,
    description: description || `Clawdbot skill: ${name}`,
    path: skillPath,
  };
}

/**
 * Infer capabilities from skill metadata
 */
function inferCapabilities(skillName: string): Array<{ skill: string; confidence: number }> {
  // Map common skill names to AIP skill taxonomy
  const skillMapping: Record<string, string> = {
    'remotion-video': 'video-generation',
    'kling-video-maker': 'video-generation',
    'text-to-speech': 'speech-synthesis',
    'speech-to-text': 'speech-recognition',
    'marp-presenter': 'presentation-generation',
    'weather': 'data-retrieval',
    'researcher': 'web-research',
    'habit-tracker': 'data-tracking',
    'money-talk': 'expense-tracking',
    'daily-briefer': 'summarization',
    'email-zero': 'email-management',
    'zero-calendar': 'calendar-management',
    'things-mac': 'task-management',
    'github': 'code-integration',
    'notion': 'note-management',
  };

  const mappedSkill = skillMapping[skillName] || skillName;

  return [
    {
      skill: mappedSkill,
      confidence: 0.9, // Default confidence
    },
  ];
}

async function main() {
  console.log('🤖 Clawdbot → AIP Integration\n');
  console.log(`Skills directory: ${SKILLS_DIR}`);
  console.log(`Registry URL: ${REGISTRY_URL}\n`);

  const client = new AIPClient(REGISTRY_URL);

  // Scan skills directory
  const skillDirs = fs.readdirSync(SKILLS_DIR).filter((dir) => {
    const fullPath = path.join(SKILLS_DIR, dir);
    return fs.statSync(fullPath).isDirectory();
  });

  console.log(`Found ${skillDirs.length} skill(s)\n`);

  let registered = 0;
  let skipped = 0;

  for (const skillDir of skillDirs) {
    const skillPath = path.join(SKILLS_DIR, skillDir);
    const metadata = parseSkillMd(skillPath);

    if (!metadata) {
      console.log(`⚠️  Skipping ${skillDir} (no SKILL.md found)`);
      skipped++;
      continue;
    }

    // Create agent profile
    const agentProfile = createAgent({
      id: `did:aip:clawdbot:skill:${skillDir}`,
      name: metadata.name,
      description: metadata.description,
      capabilities: inferCapabilities(skillDir).map((c) =>
        createCapability(c.skill, c.confidence)
      ),
      endpoints: {
        docs: `file://${skillPath}/SKILL.md`,
      },
      metadata: {
        platform: 'clawdbot',
        skill_path: skillPath,
        skill_name: skillDir,
        registered_at: new Date().toISOString(),
      },
    });

    // Register with AIP
    try {
      await client.register(agentProfile);
      console.log(`✅ Registered: ${metadata.name} (${skillDir})`);
      registered++;
    } catch (error) {
      console.error(`❌ Failed to register ${skillDir}:`, error);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Registered: ${registered}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${skillDirs.length}`);

  console.log('\n🎉 Done!\n');
  console.log('Next steps:');
  console.log(`  1. Start the registry: cd reference-impl/server && npm run dev`);
  console.log(`  2. Search for skills: curl ${REGISTRY_URL}/agents?skill=video-generation`);
  console.log(`  3. View a profile: curl ${REGISTRY_URL}/agents/did:aip:clawdbot:skill:remotion-video`);
}

main().catch(console.error);
