let selectedCommand = figma.command;

const mypage = figma.currentPage

const allFrames = figma.currentPage.findAll(node => node.type === "FRAME")

// Filter out frames which are nested inside other frames
const filteredFrames = allFrames.filter(node => node.parent.type === "PAGE")

switch (selectedCommand) {
  case "lefttoright":
    var ordered = filteredFrames.sort(function(a,b) {
      if (a.y + a.height <= b.y) { return -1; }
      if (b.y + b.height <= a.y) { return 1; }
      return a.x - b.x;
    }
    
    // Pushing the sorted frames one by one into the parent page
    for (var i = ordered.length - 1; i >= 0; i--) {
    mypage.appendChild(filteredFrames[i]);
    }
    // Close plugin with a toast message
    figma.closePlugin('Frames in your layer-list have been arranged horizontally ↔️');
    break;
  
  case "toptobottom":
    var ordered = filteredFrames.sort(function(a,b) {
      if (a.x + a.width <= b.x) { return -1; }
      if (b.x + b.width <= a.x) { return 1; }
      return a.y - b.y;
    }

    // Pushing the sorted frames one by one into the parent page
    for (var j = ordered.length - 1; j >= 0; j--) {
    mypage.appendChild(filteredFrames[j]);
    }
    figma.closePlugin('Frames in your layer-list have been arranged vertically ↕️');
  }