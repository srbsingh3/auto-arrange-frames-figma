// Analytics helper functions
const MIXPANEL_TOKEN = 'f2fc5d8644d4213519364c164f39a155';

// Generate an anonymized ID for the user
function getAnonymizedUserId(): string {
  try {
    // Create a simple hash of the user ID to anonymize it
    const userId = figma.currentUser?.id || 'anonymous';
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return 'user_' + Math.abs(hash).toString(16);
  } catch (error) {
    return 'anonymous';
  }
}

// Get user name safely
function getUserName(): string {
  try {
    return figma.currentUser?.name || 'Anonymous User';
  } catch (error) {
    return 'Anonymous User';
  }
}

// Track event using Mixpanel's server-side tracking
async function trackEvent(eventName: string, properties: Record<string, any>) {
  try {
    const distinctId = getAnonymizedUserId();
    
    // Create the event data
    const eventData = {
      event: eventName,
      properties: {
        ...properties,
        token: MIXPANEL_TOKEN,
        distinct_id: distinctId,
        time: Date.now()
      }
    };

    // Send event to Mixpanel using server-side tracking
    const response = await fetch('https://api.mixpanel.com/track', {
      method: 'POST',
      headers: {
        'Accept': 'text/plain'
      },
      body: `data=${encodeURIComponent(JSON.stringify([eventData]))}`
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Also store locally for backup
    const events = await figma.clientStorage.getAsync('mixpanel_events') || [];
    events.push(eventData);
    await figma.clientStorage.setAsync('mixpanel_events', events);

    console.log('Event tracked:', eventName, properties);
  } catch (error) {
    console.error('Failed to track event:', error);
  }
}

// Track user properties
async function identifyUser() {
  try {
    const distinctId = getAnonymizedUserId();
    const userProperties = {
      $last_login: new Date().toISOString()
    };

    // Send user properties to Mixpanel using server-side tracking
    const userData = {
      $token: MIXPANEL_TOKEN,
      $distinct_id: distinctId,
      $set: userProperties
    };

    const response = await fetch('https://api.mixpanel.com/engage', {
      method: 'POST',
      headers: {
        'Accept': 'text/plain'
      },
      body: `data=${encodeURIComponent(JSON.stringify([userData]))}`
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Store locally for backup
    await figma.clientStorage.setAsync('mixpanel_user_properties', {
      distinct_id: distinctId,
      properties: userProperties
    });

    console.log('User identified:', distinctId);
  } catch (error) {
    console.error('Failed to identify user:', error);
  }
}

function sortNodes(nodes: readonly SceneNode[]): SceneNode[] {
  return [...nodes].sort((a, b) => {
    if (a.y !== b.y) {
      return a.y - b.y;
    }
    return a.x - b.x;
  });
}

// Helper function to count node types
function countNodeTypes(nodes: readonly SceneNode[]): Record<string, number> {
  const counts: Record<string, number> = {};
  nodes.forEach(node => {
    counts[node.type] = (counts[node.type] || 0) + 1;
  });
  return counts;
}

// Helper function to track analytics
async function trackAnalytics(command: string, initialNodes: readonly SceneNode[], processedNodes: any[]) {
  const initialNodeTypes = countNodeTypes(initialNodes);
  const processedNodeTypes = countNodeTypes(processedNodes.map(p => p.node));
  
  await trackEvent('arrange_layers', {
    command,
    initial_node_types: initialNodeTypes,
    processed_node_types: processedNodeTypes,
    total_nodes: initialNodes.length
  });
}

// Main function to handle the plugin logic
async function main() {
  // Initialize analytics
  await identifyUser();

  const selectedCommand = figma.command;
  const mypage = figma.currentPage;
  const topLevelNodes = figma.currentPage.children;

  switch (selectedCommand) {
    case "lefttoright":
      var ordered = [...topLevelNodes].sort(function(a,b) {
        if (a.y + a.height <= b.y) { return -1; }
        if (b.y + b.height <= a.y) { return 1; }
        return a.x - b.x;
      });

      const processedNodesLeftToRight = ordered.map(node => {
        if (node.type === "SECTION") {
          return { node: node, sortedChildren: sortNodes(node.children) };
        } else {
          return { node: node };
        }
      });
      
      // Track analytics before processing
      await trackAnalytics('lefttoright', topLevelNodes, processedNodesLeftToRight);
      
      // Pushing the sorted frames one by one into the parent page
      for (var i = processedNodesLeftToRight.length - 1; i >= 0; i--) {
        const currentProcessedNode = processedNodesLeftToRight[i];
        const nodeToAppend = currentProcessedNode.node;

        if (currentProcessedNode.sortedChildren) {
          for (var j = currentProcessedNode.sortedChildren.length - 1; j >= 0; j--) {
            (nodeToAppend as SectionNode).appendChild(currentProcessedNode.sortedChildren[j]);
          }
        }
        mypage.appendChild(nodeToAppend);
      }
      figma.closePlugin('[MP1] Layers in your layer-list have been arranged horizontally ↔️');
      break;
    
    case "toptobottom":
      var ordered = [...topLevelNodes].sort(function(a,b) {
        if (Math.abs(a.x - b.x) > 1) {
          return a.x - b.x;
        }
        return a.y - b.y;
      });

      const processedNodesTopToBottom = ordered.map(node => {
        if (node.type === "SECTION") {
          const sortedChildren = [...node.children].sort(function(a, b) {
            if (Math.abs(a.x - b.x) > 1) {
              return a.x - b.x;
            }
            return a.y - b.y;
          });
          return { node: node, sortedChildren: sortedChildren };
        } else {
          return { node: node };
        }
      });

      // Track analytics before processing
      await trackAnalytics('toptobottom', topLevelNodes, processedNodesTopToBottom);

      // Pushing the sorted frames one by one into the parent page
      for (var k = processedNodesTopToBottom.length - 1; k >= 0; k--) {
        const currentProcessedNode = processedNodesTopToBottom[k];
        const nodeToAppend = currentProcessedNode.node;

        if (currentProcessedNode.sortedChildren) {
          for (var l = currentProcessedNode.sortedChildren.length - 1; l >= 0; l--) {
            (nodeToAppend as SectionNode).appendChild(currentProcessedNode.sortedChildren[l]);
          }
        }
        mypage.appendChild(nodeToAppend);
      }
      figma.closePlugin('[MP] Layers in your layer-list have been arranged vertically ↕️');
      break;
  }
}

// Start the plugin
main().catch(error => {
  console.error('Plugin error:', error);
  figma.closePlugin('An error occurred while processing your request.');
});