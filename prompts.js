const prompts = [
  {
    "group": "动画与插画",
    "style": "Japanese Ukiyo-e",
    "prompt": "Japanese Ukiyo-e style. Woodblock print aesthetic. Bold outlines, flat colors. Limited palette with indigo and earth tones. Edo period subject matter. Asymmetrical composition. Visible wood grain texture. Calligraphic elements."
  },
  {
    "group": "动画与插画",
    "style": "Manga",
    "prompt": "Manga-style illustration, black and white, clean linework, dynamic composition"
  },
  {
    "group": "动画与插画",
    "style": "Anime",
    "prompt": "Anime-style background scenery. Vibrant colors with cel-shading technique. Detailed urban or natural landscape. Stylized architecture and vegetation. Dramatic lighting and atmospheric perspective. Clean linework defining structures and objects. Subtle textures for added depth. Overall composition inspired by classic anime aesthetics."
  },
  {
    "group": "动画与插画",
    "style": "Watercolor Illustration",
    "prompt": "Watercolor illustration style. Dreamy, ethereal atmosphere with soft, flowing brushstrokes. Gentle blending of colors creating a fluid, organic feel. Light, translucent layers for a luminous effect. Emphasis on natural textures and delicate details. Use of white space to enhance the airy, whimsical quality."
  },
  {
    "group": "动画与插画",
    "style": "3D Animation",
    "prompt": "3D animation style. Realistic lighting and shadows to create depth. Detailed textures and materials for lifelike surfaces. Dynamic camera angles and perspectives. Smooth, fluid motion for characters and objects. Rich, vibrant color palette. Emphasis on three-dimensional space and volume. Integration of visual effects like reflections and refractions."
  },
  {
    "group": "科幻与奇幻",
    "style": "Wasteland",
    "prompt": "Post-apocalyptic wasteland. Ruined cityscape. Muted browns and grays. Harsh lighting. Scattered debris and wreckage. Overgrown vegetation on structures. Weathered metal surfaces. Makeshift shelters. Hazy, dusty atmosphere. Distant decaying skyscrapers. Survival mood in harsh environment."
  },
  {
    "group": "科幻与奇幻",
    "style": "Retro-futurism",
    "prompt": "Retro-futuristic scene. 1950s aesthetic meets advanced technology. Sleek flying cars. Atomic age architecture. Vibrant color palette with chrome accents. Retrofitted household appliances. Space-age fashion. Raygun gothic style. Optimistic vision of the future from the past."
  },
  {
    "group": "科幻与奇幻",
    "style": "Space Opera",
    "prompt": "Space Opera scene. Vast starfield with colorful nebulae. Massive ornate spacecraft. Alien planet with multiple moons. Dramatic space lighting. Advanced tech elements. Diverse alien species. Epic scale. Vibrant cosmic colors. Sleek futuristic designs."
  },
  {
    "group": "科幻与奇幻",
    "style": "Steampunk",
    "prompt": "Steampunk scene. Victorian-era aesthetics with anachronistic technology. Brass and copper machinery. Gears, cogs, and clockwork mechanisms. Steam-powered devices. Ornate metalwork and pipes. Leather and wood accents. Sepia-toned color palette. Top hats, goggles, and corsets. Industrial revolution meets fantasy. Airships or mechanical contraptions in the background."
  },
  {
    "group": "科幻与奇幻",
    "style": "Cyberpunk",
    "prompt": "Cyberpunk cityscape. Neon-lit urban sprawl. Towering skyscrapers with holographic ads. Rainy night streets reflecting neon lights. High-tech and low-life contrast. Cybernetic characters in futuristic attire. Flying cars and advanced tech devices. Gritty atmosphere with a mix of decay and innovation. Vibrant colors dominated by blues and purples."
  },
  {
    "group": "传统与文化",
    "style": "Oil Painting",
    "prompt": "style Oil painting artwork, rich impasto technique, visible brushstrokes, textured canvas"
  },
  {
    "group": "传统与文化",
    "style": "Ethnic Art",
    "prompt": "Ethnic art illustration, vibrant colors, traditional patterns, cultural symbolism"
  },
  {
    "group": "传统与文化",
    "style": "Paper Quilling Artwork",
    "prompt": "Paper quilling artwork style. Use of rolled and shaped strips of paper to create intricate designs. Emphasis on color and texture. Layering techniques to add depth and dimension. Delicate patterns and flowing lines. Whimsical and imaginative themes. Attention to detail in each quilled element."
  },
  {
    "group": "传统与文化",
    "style": "Chinese Ink Painting",
    "prompt": "Traditional Chinese ink painting style. Monochromatic black ink on textured rice paper. Minimalist composition with ample negative space. Delicate brushstrokes varying in thickness and intensity. Subtle gradations of ink wash creating depth and atmosphere. Emphasis on capturing the essence and spirit of the scene rather than precise details. Ethereal and poetic mood. Balance of bold, expressive strokes and fine, detailed lines. Inspired by Song Dynasty landscape paintings."
  },
  {
    "group": "传统与文化",
    "style": "Vintage",
    "prompt": "a painting of Vintage-style illustration, nostalgic atmosphere, faded colors, aged texture"
  },
  {
    "group": "传统与文化",
    "style": "Ivory Carving Artwork",
    "prompt": "Ivory carving artwork style. Emphasis on the unique qualities of ivory as a material, including its smooth texture, creamy color, and ability to hold fine detail. Carving techniques may include round carving, openwork carving, relief carving, and pierced carving. Subject matter ranges from realistic figures and animals to intricate geometric patterns and floral designs. Attention to craftsmanship and the creation of visually striking, tactile objects. Appreciation for the rarity of ivory and the skill required to transform it into art."
  },
  {
    "group": "传统与文化",
    "style": "Stained Glass Artwork",
    "prompt": "in style of Stained Glass Artwork"
  },
  {
    "group": "传统与文化",
    "style": "Clay Artwork",
    "prompt": "Clay artwork style. Emphasis on the malleability and texture of clay, allowing for intricate designs and forms. Techniques include hand-building, wheel throwing, and sculpting. Focus on creating both functional pottery and decorative sculptures. Rich color palette achieved through glazing and surface treatments. Attention to detail in texture and patterns, enhancing visual interest. Exploration of themes such as nature, mythology, and everyday life. Use of various clay types, including earthenware, stoneware, and porcelain."
  },
  {
    "group": "传统与文化",
    "style": "Origami Artwork",
    "prompt": "Origami artwork style. Emphasis on the intricate folding techniques that transform a flat sheet of paper into three-dimensional sculptures. Use of geometric shapes and patterns to create both realistic and abstract designs. Focus on the smooth lines and crisp creases that define the structure of each piece. Exploration of themes such as nature, animals, and fantasy. Incorporation of various paper types and colors to enhance visual appeal. Attention to detail in the presentation of each folded piece, showcasing craftsmanship and creativity."
  },
  {
    "group": "传统与文化",
    "style": "Rangoli",
    "prompt": "Rangoli art style. Emphasis on intricate and colorful patterns created on the floor or tabletop. Use of natural materials such as colored powders, rice flour, flower petals, and sand. Designs often include geometric shapes, floral motifs, and symbols of Hindu deities. Traditionally created during festivals like Diwali, Pongal, and Onam to welcome guests and deities. Focus on symmetry and balance in the designs, reflecting cultural heritage and traditions. Often made by women and passed down through generations, symbolizing joy, prosperity, and good luck."
  },
  {
    "group": "现代与抽象",
    "style": "Surrealism",
    "prompt": "Surrealist painting, dreamlike atmosphere, juxtaposition of unrelated objects. Hyper-realistic rendering technique with impossible scenarios."
  },
  {
    "group": "现代与抽象",
    "style": "Abstract Art",
    "prompt": "Abstract art style. Emphasis on shapes, colors, and lines. Non-representational forms with smooth transitions. Use of texture and layering to create depth. Bold color contrasts and dynamic compositions. Focus on emotional expression and spontaneity. Clean, modern aesthetic with light, watercolor-like brushstrokes. Increased emphasis on line work."
  },
  {
    "group": "现代与抽象",
    "style": "Pointillism",
    "prompt": "Pointillism style. Use of small, distinct dots of pure color. Create images through optical color mixing. Emphasis on light and shadow with vibrant hues. Detailed composition with a focus on texture. Depict natural scenes or abstract forms using color dots. Achieve depth and dimension through layering of dots."
  },
  {
    "group": "现代与抽象",
    "style": "Retro Poster Style",
    "prompt": "Retro poster style. Bold, vintage typography with a nostalgic feel. Limited color palette featuring muted or pastel tones. Distressed textures and grainy effects for an aged look. Geometric shapes and simple forms. Iconic imagery from mid-20th century. Emphasis on bold outlines and flat design elements. Overall aesthetic evokes a sense of nostalgia and timelessness."
  },
  {
    "group": "现代与抽象",
    "style": "Minimalist Poster Style",
    "prompt": "Minimalist poster style. Clean lines and simple geometric shapes. Limited color palette with neutral or bold tones. Emphasis on negative space and balance. Focus on essential elements, removing unnecessary details. Modern and sleek aesthetic. Subtle textures to add depth without clutter."
  },
  {
    "group": "现代与抽象",
    "style": "Sketch Drawing",
    "prompt": "Sketch drawing style. Emphasis on loose, expressive lines and shapes. Use of shading techniques such as hatching and cross-hatching for depth. Focus on capturing the essence and movement of the subject. Quick, informal sketches that prioritize ideas over perfection. Varied line weights to indicate light and shadow. Incorporation of textures and details to enhance visual interest."
  },
  {
    "group": "现代与抽象",
    "style": "Op Art",
    "prompt": "Op Art style. Emphasis on optical illusions and visual effects. Use of geometric shapes and patterns to create movement. High contrast colors, often black and white or vibrant hues. Repetition and rhythm in design to enhance visual perception. Precision in composition to achieve symmetry and balance. Engaging the viewer through shifting perspectives and dynamic forms."
  },
  {
    "group": "现代与抽象",
    "style": "Doodle Art",
    "prompt": "Doodle art style. Emphasis on playful, spontaneous designs and whimsical characters. Use of intricate patterns and repetitive elements to create visual interest. Combination of childlike simplicity with detailed illustrations. Can be black and white or colorful, allowing for creative expression. Incorporation of various themes, such as nature, fantasy, and everyday life. Freeform and non-representational, encouraging imagination and personal style. Often serves as a form of relaxation and mindfulness."
  },
  {
    "group": "历史与艺术运动",
    "style": "Constructivism",
    "prompt": "a painting in style of Constructivism art"
  },
  {
    "group": "历史与艺术运动",
    "style": "Bauhaus",
    "prompt": "a painting in style of Bauhaus art"
  },
  {
    "group": "历史与艺术运动",
    "style": "Renaissance",
    "prompt": "Realistic human figures with detailed anatomy. Use of linear perspective to create depth. Soft chiaroscuro lighting for three-dimensional effect. Classical themes with mythological or biblical subjects. Ornate backgrounds with architectural elements like columns and arches. Rich color palette with harmonious tones. Emphasis on natural landscapes and intricate details. Elegant drapery and textures in clothing."
  },
  {
    "group": "历史与艺术运动",
    "style": "Baroque Period",
    "prompt": "Baroque art style. Dramatic use of light and shadow (chiaroscuro). Rich, vibrant colors with ornate details. Emphasis on movement and emotion. Dynamic compositions with a sense of grandeur. Religious and mythological themes. Exquisite detail and texture to create depth. Theatrical and expressive scenes."
  },
  {
    "group": "历史与艺术运动",
    "style": "Gothic Art",
    "prompt": "Gothic art style. Emphasis on religious themes and symbolism. Use of elongated figures and dramatic poses. Rich, vibrant colors with gold accents. Intricate details and ornate patterns. Stained glass effects and pointed arches. Mystical and spiritual atmosphere. Detailed backgrounds with architectural elements."
  },
  {
    "group": "历史与艺术运动",
    "style": "Victorian Period",
    "prompt": "Victorian period art style. Rich and detailed compositions with ornate embellishments. Emphasis on realism and intricate details. Use of vibrant colors and dramatic lighting. Themes of romanticism, mythology, and daily life. Symbolic elements conveying moral or social messages. Elegant and refined aesthetic with a focus on beauty and decorum."
  }
];