export const COVER_IMAGE_POOL = [
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&q=80&w=800'
];

export const getCoverImageForBlog = (blog) => {
  let src = blog?.coverImage;
  // If custom user cover image exists and is NOT the old single fallback image:
  if (src && src.trim() && !src.includes('1499750310107-5fef28a66643')) {
    const mdMatch = src.match(/!\[.*?\]\((.*?)\)/);
    if (mdMatch) return mdMatch[1];
    const linkMatch = src.match(/\[.*?\]\((.*?)\)/);
    if (linkMatch) return linkMatch[1];
    return src.trim();
  }

  // Otherwise pick a deterministic varied image from pool based on blog title/id/category
  const seedStr = (blog?.title || blog?._id || 'blog') + (blog?.category || '');
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COVER_IMAGE_POOL.length;
  return COVER_IMAGE_POOL[index];
};
