let selectedCommand = figma.command;
const mypage = figma.currentPage;
const topLevelNodes = figma.currentPage.children;
function sortNodes(nodes) {
    return [...nodes].sort((a, b) => {
        if (a.y !== b.y) {
            return a.y - b.y;
        }
        return a.x - b.x;
    });
}
switch (selectedCommand) {
    case "lefttoright":
        var ordered = [...topLevelNodes].sort(function (a, b) {
            if (a.y + a.height <= b.y) {
                return -1;
            }
            if (b.y + b.height <= a.y) {
                return 1;
            }
            return a.x - b.x;
        });
        const processedNodesLeftToRight = ordered.map(node => {
            if (node.type === "SECTION") {
                return { node: node, sortedChildren: sortNodes(node.children) };
            }
            else {
                return { node: node };
            }
        });
        // Pushing the sorted frames one by one into the parent page
        // Iterate from processedNodesLeftToRight.length - 1 down to 0
        for (var i = processedNodesLeftToRight.length - 1; i >= 0; i--) {
            const currentProcessedNode = processedNodesLeftToRight[i];
            const nodeToAppend = currentProcessedNode.node;
            if (currentProcessedNode.sortedChildren) {
                // This means nodeToAppend is a section
                for (var j = currentProcessedNode.sortedChildren.length - 1; j >= 0; j--) {
                    nodeToAppend.appendChild(currentProcessedNode.sortedChildren[j]);
                }
            }
            mypage.appendChild(nodeToAppend);
        }
        // Close plugin with a toast message
        figma.closePlugin('Layers in your layer-list have been arranged horizontally ↔️');
        break;
    case "toptobottom":
        var ordered = [...topLevelNodes].sort(function (a, b) {
            // First sort by x-position to group frames in the same vertical column
            if (Math.abs(a.x - b.x) > 1) { // Using 1px threshold to account for small rounding differences
                return a.x - b.x;
            }
            // Then sort by y-position within the same column
            return a.y - b.y;
        });
        const processedNodesTopToBottom = ordered.map(node => {
            if (node.type === "SECTION") {
                // Use the same sorting logic as the top-level nodes for section children
                const sortedChildren = [...node.children].sort(function (a, b) {
                    if (Math.abs(a.x - b.x) > 1) {
                        return a.x - b.x;
                    }
                    return a.y - b.y;
                });
                return { node: node, sortedChildren: sortedChildren };
            }
            else {
                return { node: node };
            }
        });
        // Pushing the sorted frames one by one into the parent page
        // Iterate from processedNodesTopToBottom.length - 1 down to 0
        for (var k = processedNodesTopToBottom.length - 1; k >= 0; k--) {
            const currentProcessedNode = processedNodesTopToBottom[k];
            const nodeToAppend = currentProcessedNode.node;
            if (currentProcessedNode.sortedChildren) {
                // This means nodeToAppend is a section
                for (var l = currentProcessedNode.sortedChildren.length - 1; l >= 0; l--) {
                    nodeToAppend.appendChild(currentProcessedNode.sortedChildren[l]);
                }
            }
            mypage.appendChild(nodeToAppend);
        }
        figma.closePlugin('Layers in your layer-list have been arranged vertically ↕️');
}
