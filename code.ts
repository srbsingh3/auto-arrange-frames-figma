const mypage = figma.currentPage

const allFrames = figma.currentPage.findAll(node => node.type === "FRAME")

// Filter out frames which are nested inside other frames
const filteredFrames = allFrames.filter(node => node.parent.type === "PAGE")

// Virtually align frames.
var myFunction = function(givenArtboard) {
  for (i = 0; i < filteredFrames.length; i++) {
    if (
      (Math.abs(givenArtboard.y - filteredFrames[i].y) < givenArtboard.height) &&
      (Math.abs(givenArtboard.y - filteredFrames[i].y) < filteredFrames[i].height)
    ) {
      filteredFrames[i].y = givenArtboard.y;
    }
  }
}

filteredFrames.forEach(myFunction);

// Horizontal Sorting of filtered frames
var ordered = filteredFrames.sort(function(a,b) {
  var compareY = a.y - b.y;
  if (compareY != 0) {
    return compareY;
  } else {
    return a.x - b.x;
  }
});

// Pushing the sorted frames one by one into the parent page
for (var i = ordered.length - 1; i >= 0; i--) {
  mypage.appendChild(filteredFrames[i]);
}

// Close plugin with a toast message
figma.closePlugin('Frames in your layer-list have been arranged horizontally.');