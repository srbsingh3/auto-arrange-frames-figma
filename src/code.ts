// Analytics helper functions
const MIXPANEL_TOKEN = 'f2fc5d8644d4213519364c164f39a155';
const PLUGIN_VERSION = '2.0.0'; // This should match manifest.json version
const PLUGIN_NAME = 'Auto Arrange Frames'; // This should match manifest.json name

// Get Figma's anonymized user ID
function getAnonymizedUserId(): string {
  try {
    return figma.currentUser?.id || 'anonymous';
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
    const userId = getAnonymizedUserId();
    
    // Create the event data with only allowed properties
    const eventData = {
      event: eventName,
      properties: {
        ...properties,
        token: MIXPANEL_TOKEN,
        distinct_id: userId,
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

    console.log('Event tracked:', eventName, properties);
  } catch (error) {
    console.error('Failed to track event:', error);
  }
}

// Track user properties
async function identifyUser() {
  try {
    const userId = getAnonymizedUserId();
    
    // Send user properties to Mixpanel using server-side tracking
    const userData = {
      $token: MIXPANEL_TOKEN,
      $distinct_id: userId,
      $set: {
        $last_login: new Date().toISOString()
      }
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

    console.log('User identified:', userId);
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
  
  function countNode(node: SceneNode) {
    // Count the current node
    counts[node.type] = (counts[node.type] || 0) + 1;
    
    // If it's a section, count its children
    if (node.type === 'SECTION') {
      node.children.forEach(child => countNode(child));
    }
  }
  
  // Count all nodes and their children
  nodes.forEach(node => countNode(node));
  
  return counts;
}

// Helper function to get section children counts
function getSectionChildrenCounts(nodes: readonly SceneNode[]): number[] {
  return nodes
    .filter(node => node.type === 'SECTION')
    .map(section => section.children.length);
}

// Helper function to track analytics
async function trackAnalytics(command: string, initialNodes: readonly SceneNode[], processedNodes: any[]) {
  const initialNodeTypes = countNodeTypes(initialNodes);
  const sectionChildrenCounts = getSectionChildrenCounts(initialNodes);
  
  await trackEvent(command, {
    initial_node_types: initialNodeTypes,
    total_nodes: initialNodes.length,
    section_children_counts: sectionChildrenCounts,
    user_id: getAnonymizedUserId(),
    invocation_context: {
      had_selection: figma.currentPage.selection.length > 0,
      selection_count: figma.currentPage.selection.length
    }
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
      figma.closePlugin('Layers in your layer-list have been arranged horizontally ↔️');
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
      figma.closePlugin('Layers in your layer-list have been arranged vertically ↕️');
      break;
  }
}

// Start the plugin
main().catch(error => {
  console.error('Plugin error:', error);
  figma.closePlugin('An error occurred while processing your request.');
});