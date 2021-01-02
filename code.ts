const allFrames = figma.currentPage.findAll(node => node.type === "FRAME")

const mypage = figma.currentPage

// Horizontal Sorting
var ordered = allFrames.sort(function(a,b) {
  var compareY = a.y - b.y;
  if (compareY != 0) {
    return compareY;
  } else {
    return a.x - b.x;
  }
});

// Pushing the frames one by one into the parent page
for (var i = ordered.length - 1; i >= 0; i--) {
  mypage.appendChild(allFrames[i]);
}

figma.closePlugin();