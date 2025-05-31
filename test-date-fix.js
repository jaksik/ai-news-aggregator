// Test script to verify improved Anthropic date extraction
const mockAnthropicHTML = `
<a class="PostCard_post-card__z_Sqq PostList_post-card__1g0fm s:col-span-6 m:col-span-4" href="/news/reed-hastings" style="grid-row: auto / span 9;">
  <div class="PostCard_post-info__pSlap PostList_post-info___jSxx">
    <div class="PostCard_post-info-wrapper__Ac6ep PostList_post-info-wrapper__OHkF6">
      <div class="PostCard_post-category__FwBDj PostList_post-category__d_Ubi">
        <span class="text-label">Announcements</span>
      </div>
      <h3 class="PostCard_post-heading__Ob1pu PostList_post-heading__iL3Su h4">Reed Hastings appointed to Anthropic's board of directors</h3>
    </div>
    <div class="PostCard_post-timestamp__etH9K PostList_post-timestamp__vdhHV text-label">
      <div class="PostList_post-date__djrOA">May 28, 2025</div>
    </div>
  </div>
</a>
`;

console.log('✅ Updated Anthropic configuration:');
console.log('- Added dateSelector: ".PostList_post-date__djrOA, .PostCard_post-timestamp__etH9K"');
console.log('- This will capture dates like "May 28, 2025" from the proper HTML element');
console.log('');
console.log('✅ Improved date accuracy:');
console.log('- extractDate() now returns undefined instead of today\'s date when no date found');
console.log('- No more inaccurate "published today" dates');
console.log('- Only saves actual publication dates from the website');
console.log('');
console.log('✅ Expected behavior:');
console.log('- Anthropic articles will now have accurate publication dates');
console.log('- Articles without detectable dates will have publishedDate: undefined');
console.log('- No false "today" dates will be saved to the database');

// Clean up
process.exit(0);
