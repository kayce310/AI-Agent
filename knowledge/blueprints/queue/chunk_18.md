
[LAYOUT]
4x4 grid layout, 16 panels total, each panel separated by thin black border lines, 
numbered cells from 1 to 16, consistent panel size

[CHARACTER]
{argument name="character" default="young female dancer, athletic build, ponytail hairstyle, crop top and baggy pants, sneakers"}, same character in all panels

[PANEL STRUCTURE - per cell]
top-left: bold number badge + {argument name="title" default="Korean title text"}
center: full-body character pose illustration
bottom-left: {argument name="description" default="Korean description text (3-4 lines)"}
overlay: directional arrows indicating movement direction

[ARROWS / MOTION INDICATORS]
curved arrows, straight arrows, circular rotation indicators, 
placed around the character to show movement flow and direction

[RENDERING STYLE]
high detail 3D sculpt style, soft studio lighting, subtle shadows, 
no color, grayscale shading, clean linework, game concept art quality

[NEGATIVE]
no background scenery, no color tones, no extra characters, 
no cluttered backgrounds
```

<!-- Case 132: Anime Museum Background Conversion (by @Dakiny) -->
### Case 132: [Anime Museum Background Conversion](https://x.com/Dakiny/status/2048175219966394695) (by [@Dakiny](https://x.com/Dakiny))

| Output |
| :----: |
| <img src="./images/poster_case132/output.jpg" width="300" alt="Output image"> |

**Prompt:**

```
Using the provided reference photo, recreate the same museum facade and frontal composition as a polished theatrical anime background illustration. Keep the architecture, signage, 3 flagpoles, broad steps, and overall layout consistent, but convert the image from realistic photography into a highly detailed hand-painted anime film style with clean linework, soft cel shading, gentle pastel stone colors, and crisp atmospheric lighting. Add dramatic sunlight from the upper right so the glass pyramid casts a large geometric lattice shadow across the central wall and left side of the entrance. Simplify and stylize the people into anime background characters, keeping the 2 visible groups: 1 lone figure on the left and 1 small cluster of 7 people near the center-right entrance. Preserve the clear blue-sky daytime mood while making the scene feel elegant, refined, and cinematic.
```

<!-- Case 133: 16-Pose Dance Combat Reference Sheet (by @ExquisitMe) -->
### Case 133: [16-Pose Dance Combat Reference Sheet](https://x.com/ExquisitMe/status/2048143577264402629) (by [@ExquisitMe](https://x.com/ExquisitMe))

| Output |
| :----: |
| <img src="./images/poster_case133/output.jpg" width="300" alt="Output image"> |

**Prompt:**

```
{"type":"pose reference sheet","subject":{"theme":"hip-hop dance and combat-ready movement chart","character":{"count":1,"gender_presentation":"female","age_appearance":"young adult","body_type":"fit athletic dancer","skin_tone":"light tan","hair":{"color":"black","style":"high ponytail with loose strands"},"outfit":{"count":5,"items":["white sports bra or cropped athletic top","baggy purple jogger pants","white chunky sneakers","purple wristbands or forearm bands on both arms","small hoop earrings"]}}},"style":{"image_type":"photorealistic studio pose sheet","lighting":"clean even studio lighting","background":"plain light gray to white seamless backdrop","camera":"full-body framing, straight-on view, consistent distance","rendering":"sharp realistic anatomy, dynamic motion, slight shadow under feet","face":"intentionally blurred or obscured"},"layout":{"grid":{"rows":4,"columns":4,"count":16},"numbering":{"count":16,"labels":["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16"],"position":"top-left corner of each cell"},"cell_borders":"thin black divider lines between all panels"},"poses":{"count":16,"items":[{"label":"1","description":"wide low squat, knees bent outward, torso angled slightly left, both arms extended loosely in a defensive dance stance"},{"label":"2","description":"deep side lunge to the left, left arm pointing straight left, right hand near the head, energetic directional pose"},{"label":"3","description":"low crouch with one hand touching the floor, one knee bent under the body, opposite arm extended horizontally"},{"label":"4","description":"upright one-leg balance, left knee lifted high, both arms spread outward for rhythm and balance"},{"label":"5","description":"similar one-leg raised pose with the other leg supporting, arms stretched outward in a lighter dance variation"},{"label":"6","description":"very wide grounded squat, torso pitched forward, one hand reaching toward the floor between the legs, other arm extended back"},{"label":"7","description":"dramatic standing back arch, chest lifted upward, hips forward, both arms opened behind and to the sides"},{"label":"8","description":"small jump or suspended squat, both feet off the floor, knees bent, arms spread wide symmetrically"},{"label":"9","description":"floor-supported seated lean, one hand planted behind, one arm reaching diagonally upward, legs bent to one side"},{"label":"10","description":"front-facing balance with one knee raised to hip height, one arm bent in guard position and the other extended sideways"},{"label":"11","description":"deep lateral stance, feet far apart, knees bent, both hands raised open near shoulder level like a ready combat pose"},{"label":"12","description":"low side lunge split, one hand planted on the floor, the other arm reaching vertically overhead, torso arched upward"},{"label":"13","description":"standing backward lean with relaxed bent knees, chest up, arms hanging loosely behind in a groove pose"},{"label":"14","description":"compact twisting crouch, weight low over bent legs, torso rotated, one arm pulled in and the other extended outward"},{"label":"15","description":"very wide side lunge stretch, one hand to the floor near the front foot, opposite arm reaching diagonally overhead"},{"label":"16","description":"one-leg lifted pose with knee high, one hand behind the head and the other arm extended forward, confident finishing stance"}]},"composition":"show the same dancer in all 16 panels with consistent outfit and scale, centered within each frame, designed like a movement library or choreography reference chart"}
```

<!-- Case 134: 16-Panel Dance Pose Reference Sheet (by @ExquisitMe) -->
### Case 134: [16-Panel Dance Pose Reference Sheet](https://x.com/ExquisitMe/status/2048143577264402629) (by [@ExquisitMe](https://x.com/ExquisitMe))

| Output |
| :----: |
| <img src="./images/poster_case134/output.jpg" width="300" alt="Output image"> |

**Prompt:**

```
{"type":"dance pose reference sheet","style":"clean studio pose chart, photoreal fitness-dance reference, white seamless background, sharp full-body photography, soft even lighting, minimal shadows, thin black grid lines separating panels","subject":{"count":1,"person":{"gender_presentation":"female","age_appearance":"young adult","build":"slim athletic toned dancer","skin_tone":"light tan","hair":{"color":"{argument name=\"hair color\" default=\"dark brown\"}","style":"high ponytail with loose strands"},"outfit":{"count":3,"items":["white fitted sports bra or cropped athletic tank","baggy blue-gray jogger pants","white sneakers"]}}},"layout":{"rows":4,"columns":4,"total_panels":16,"numbering":"black panel numbers in the top-left corner of each cell, labeled 1 through 16","sections":[{"title":"pose grid","position":"full page","count":16,"labels":["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16"]}]},"poses":{"count":16,"items":[{"panel":1,"description":"wide stance, knees bent, torso upright, right arm extended straight to the right in a pointing gesture, left arm bent near the body"},{"panel":2,"description":"deep low squat facing forward, feet wide apart, one hand lifted in front of the chest, the other resting near the thigh"},{"panel":3,"description":"low floor-supported pose, leaning back on one hand with hips low, one knee bent under the body, opposite arm stretched diagonally upward"},{"panel":4,"description":"standing on one leg with the other knee raised, one arm curved overhead, opposite arm extended to the right in a strong dance line"},{"panel":5,"description":"deep squat with legs wide, one hand on thigh and the other arm reaching straight upward"},{"panel":6,"description":"light upright pose with one knee lifted and both arms relaxed outward for balance"},{"panel":7,"description":"wide stance with both arms crossed tightly in front of the chest, feet planted apart"},{"panel":8,"description":"low crouch close to the floor, one hand braced on the ground, the other arm crossing the torso"},{"panel":9,"description":"dynamic side-leaning wide stance, one arm bent upward beside the head, opposite arm pointing strongly to the right"},{"panel":10,"description":"compact crouch with weight centered low, one elbow resting near a knee and head tilted slightly downward"},{"panel":11,"description":"deep side lunge with one leg extended long to the side, one hand on the floor and the other arm reaching straight up"},{"panel":12,"description":"upright wide-legged stance, one arm extended vertically overhead, the other hand relaxed near the hip"},{"panel":13,"description":"standing balance pose with one knee raised and both hands held low near the thighs"},{"panel":14,"description":"low horse stance with knees bent wide and forearms crossed in front of the chest"},{"panel":15,"description":"kneeling or very low crouched pose with one hand on the floor and the other resting on the raised knee"},{"panel":16,"description":"high side kick, balancing on one leg while the other leg extends horizontally, both arms bent in a guarded fighting pose"}]},"intent":"a {argument name=\"sheet purpose\" default=\"dance move sheet chart that can also be used for combat pose reference\"}, emphasizing silhouette variety, balance, rhythm, and dynamic athletic body lines","image_size":"landscape 16:9"}
```

<!-- Case 135: 16-Panel Female Dance Pose Sheet (by @ExquisitMe) -->
### Case 135: [16-Panel Female Dance Pose Sheet](https://x.com/ExquisitMe/status/2048143577264402629) (by [@ExquisitMe](https://x.com/ExquisitMe))

| Output |
| :----: |
| <img src="./images/poster_case135/output.jpg" width="300" alt="Output image"> |

**Prompt:**

```
{"type":"pose reference sheet","subject":{"count":1,"description":"a fit young woman dancer shown repeatedly in a clean studio reference layout","appearance":{"gender":"female","age":"young adult","build":"athletic, toned midriff","skin tone":"light to medium tan","hair":{"color":"dark brown","style":"high messy ponytail with loose strands framing the face"},"expression":"neutral to focused"},"wardrobe":{"top":"charcoal gray sports bra or cropped athletic bralette","bottom":"oversized dark gray parachute cargo pants with gathered ankles","shoes":"white sneakers","accessories":["black wristband or fingerless glove on one hand","subtle sporty styling"]}},"layout":{"background":"plain white seamless studio background","grid":{"rows":4,"columns":4,"count":16,"cell labels":["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16"]},"style":"clean contact-sheet or choreography chart with thin black dividers between panels and small black numbers at the upper left of each panel"},"poses":[{"label":"1","description":"relaxed standing pose, weight on one leg, one hand near hip, slight contrapposto"},{"label":"2","description":"wide low dance stance, one arm bent behind the head, the other arm extended and pointing to the right"},{"label":"3","description":"legs spread in a grounded stance, torso slightly tilted, one hand resting near the upper thigh"},{"label":"4","description":"very low wide squat facing forward, torso leaning back, one hand near the face and the other near the thigh"},{"label":"5","description":"wide side lunge stance, one arm arched overhead, the other arm extended outward in a stylized dance line"},{"label":"6","description":"balancing on one leg with the other knee lifted high, one hand near the face in a punchy hip-hop pose"},{"label":"7","description":"floorwork pose supported by one hand on the ground, torso reclined sideways, legs bent and lifted in a dynamic breakdance-like position"},{"label":"8","description":"casual upright pose with one hand behind the head and one knee bent upward"},{"label":"9","description":"one-legged balance pose with the lifted knee bent, both arms extended outward for motion and rhythm"},{"label":"10","description":"low kneeling or crouched pose, one knee up and one knee down, one arm thrust forward toward the viewer"},{"label":"11","description":"deep squat with legs apart, one arm curved overhead in a dramatic arc"},{"label":"12","description":"standing lean to one side with one arm extended sideways and the other hand near the hip or thigh"},{"label":"13","description":"reclining floor pose supported by one hand behind the body, one leg bent and one leg extended"},{"label":"14","description":"upright standing pose with one arm fully extended and pointing to the right"},{"label":"15","description":"front-facing pose stepping forward with one knee lifted, one arm reaching or pointing forward"},{"label":"16","description":"wide confident stance with one arm pointing diagonally upward to the right"}],"rendering":{"medium":"photorealistic studio fashion and dance reference image","lighting":"soft even studio lighting with faint shadows beneath the feet and body","camera":"full-body framing, straight-on view, consistent distance in every panel","quality":"sharp, high-resolution, realistic anatomy and fabric folds"}}
```

<!-- Case 136: 16-Pose Dance Reference Sheet (by @ExquisitMe) -->
### Case 136: [16-Pose Dance Reference Sheet](https://x.com/ExquisitMe/status/2048143577264402629) (by [@ExquisitMe](https://x.com/ExquisitMe))

| Output |
| :----: |
| <img src="./images/poster_case136/output.jpg" width="300" alt="Output image"> |

**Prompt:**

```
{"type":"pose reference sheet","subject":{"category":"female dancer fitness model","age_appearance":"young adult","build":"slim athletic","hair":{"color":"dark brown","style":"high ponytail"},"outfit":{"top":"light gray or white sports bra crop top","bottom":"baggy light gray sweatpants","shoes":"white sneakers"},"face":"softly blurred or de-emphasized facial features"},"style":{"image_type":"studio dance pose chart","background":"clean seamless white background","lighting":"bright even studio lighting with minimal shadows","color_palette":"neutral whites and light grays","camera":"full-body framing, straight-on view, consistent distance","rendering":"photorealistic"},"layout":{"grid":{"rows":4,"columns":4,"count":16,"border":"thin black dividers between cells"},"numbering":{"count":16,"labels":["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16"],"position":"top-left corner of each panel"},"sections":[{"title":"row 1","position":"top","count":4,"labels":["1 side lunge with one arm extended straight sideways and the other bent near chest","2 low floor pose leaning on one hand with one knee down and opposite arm arched upward","3 wide squat facing front with both arms opened in angular dance position","4 standing balance on one leg with opposite knee lifted and forearms crossed near chest"]},{"title":"row 2","position":"upper-middle","count":4,"labels":["5 deep backbend in wide stance with torso arched and one arm curved overhead","6 wide squat with one hand behind head and the other arm pointing outward","7 kneeling side stretch with one hand on floor and opposite arm reaching straight up","8 standing arabesque-style extension with torso tilted forward and one leg lifted high behind/sideways"]},{"title":"row 3","position":"lower-middle","count":4,"labels":["9 wide squat with torso tilted left, one arm curved overhead and one arm extended low","10 front-facing wide squat with both arms stretched diagonally in opposite directions","11 relaxed standing pose with legs apart and both forearms crossing in front of torso","12 floor recline supported on one hand and one knee, torso leaning back with bent legs"]},{"title":"row 4","position":"bottom","count":4,"labels":["13 small jump or lifted balance with one knee raised and one arm bent upward","14 low crouch squat with one hand reaching toward floor and other arm extended sideways","15 dramatic side backbend in wide stance with hair swinging and one arm curved overhead","16 powerful wide squat with one hand at chest and the other lowered to the side"]}],"overall_composition":"all 16 poses shown as separate panels in a uniform contact sheet"},"prompt":"Create a clean studio contact sheet of {argument name=\"pose count\" default=\"16\"} full-body dance or combat-reference poses featuring a {argument name=\"subject type\" default=\"young athletic woman\"} in a {argument name=\"outfit\" default=\"light gray sports bra, loose gray sweatpants, and white sneakers\"}. Use a seamless {argument name=\"background color\" default=\"white\"} background, bright even lighting, and a consistent straight-on camera. Arrange the poses in a 4x4 grid with thin black panel lines and small black numbers 1 through 16 in the top-left of each cell. The poses should mix standing, squatting, kneeling, floorwork, balance, kick-extension, backbend, and angular arm positions suitable for a dance sheet chart or combat movement reference. Keep the styling photorealistic, crisp, minimal, and instructional, with consistent wardrobe and hair across all panels."}
```

<!-- Case 137: Gas Giant Descent Storyboard (by @xRahultripathi) -->
### Case 137: [Gas Giant Descent Storyboard](https://x.com/xRahultripathi/status/2048140775356354892) (by [@xRahultripathi](https://x.com/xRahultripathi))

| Output |
| :----: |
| <img src="./images/poster_case137/output.jpg" width="300" alt="Output image"> |

**Prompt:**

```
{"type":"cinematic sci-fi storyboard contact sheet","subject":{"primary":"a small futuristic spacecraft descending into a massive gas giant storm system","secondary":"an enormous leviathan-like silhouette hidden within the clouds","mood":"oppressive, catastrophic, awe-struck, high tension, cosmic dread","style":"photorealistic cinematic concept art with dark sci-fi realism, volumetric storm clouds, strong contrast, amber and black palette with occasional cold blue lightning","aspect_ratio":"16:9"},"vehicle":{"design":"compact armored deep-atmosphere ship with 3 bright rear engines, angular industrial hull, worn metallic panels","scale":"tiny compared to the planet and creature"},"layout":{"grid":{"rows":3,"columns":4,"count":12},"sections":[{"position":"row 1 col 1","description":"wide exterior shot of the ship entering the upper atmosphere of a colossal gas giant at extreme speed, glowing clouds streaked with fire and friction around the vessel, curved planetary horizon visible"},{"position":"row 1 col 2","description":"cockpit POV, dark interior filled with red and cyan holographic instruments, forward visibility collapsing into turbulent storm layers and electrical haze"},{"position":"row 1 col 3","description":"exterior mid-wide shot of the ship diving into a gigantic rotating cloud funnel, surrounded by violent spiraling storm structure"},{"position":"row 1 col 4","description":"extreme close exterior of the ship hull as bright lightning strikes dangerously close, white electric energy crawling across the metal surface"},{"position":"row 2 col 1","description":"dashboard warning screen in red, showing a critical systems failure interface with the exact visible text count of 4 warning lines and 1 large percentage readout: ['WARNING','ENGINES COMPROMISED','THRUST FLUCTUATION','GRAVITY SPIKE DETECTED','DESCENT RATE -453%']"},{"position":"row 2 col 2","description":"rear three-quarter exterior of the ship fighting turbulence inside dense storm clouds, engines burning hard while the craft barely holds course"},{"position":"row 2 col 3","description":"massive circular disturbance forming in the clouds like an eye or maw, entire storm systems displaced by something huge moving beneath"},{"position":"row 2 col 4","description":"second cockpit view with radar-like navigation display and red alert text, pilot making a blind evasive maneuver through lightning-filled darkness"},{"position":"row 3 col 1","description":"first reveal of the colossal creature shape rising near the ship, black organic surface and immense curved anatomy emerging from darkness, ship tiny at lower left"},{"position":"row 3 col 2","description":"spiral descent shot, ship caught inside a vortex tunnel of clouds, spinning downward with engines flaring as it struggles to recover"},{"position":"row 3 col 3","description":"sudden breakthrough into a calm void, minimal composition, ship flying in eerie silence through dark open space with soft mist and no visible storm around it"},{"position":"row 3 col 4","description":"final reveal, gigantic leviathan fully emerging behind or beside the ship in cleared space, backlit by a pale circular storm opening, enormous open maw-like silhouette dwarfing the craft"}],"continuity":"all 12 panels depict one continuous descent sequence from atmospheric entry to final creature reveal"},"lighting":{"primary":"glowing amber storm light","secondary":"red cockpit interface glow","accents":"blue-white lightning and engine exhaust"},"environment":{"location":"inside the upper and middle storm layers of a gigantic gas giant","weather":"violent turbulence, electrical storms, vortex funnels, cloud walls, pressure chaos","threat":"no safe zone, repeated near-failure, unknown colossal presence driving the storm"}}
```

<!-- Case 138: Surreal Baroque Painting Reality Fracture (by @JohnnyWang8802) -->
### Case 138: [Surreal Baroque Painting Reality Fracture](https://x.com/JohnnyWang8802/status/2048129335853559824) (by [@JohnnyWang8802](https://x.com/JohnnyWang8802))

| Output |
| :----: |
| <img src="./images/poster_case138/output.jpg" width="300" alt="Output image"> |

**Prompt:**

```
A {argument name="painting style" default="baroque oil painting"} comes to life — its painted figures climbing out of the gilded frame into a {argument name="setting" default="modern white gallery"}, half their bodies still in flat 2D paint, half fully volumetric 3D humans, brushstrokes visible on their skin, the painting's background leaking watercolor clouds into the gallery ceiling, museum visitors frozen in shock, hyper-detailed, {argument name="artist influence" default="René Magritte meets Pixar"}, reality fracturing at every boundary
```

<!-- Case 139: Urban Alley Mural Artist (by @Professor_134) -->
### Case 139: [Urban Alley Mural Artist](https://x.com/Professor_134/status/2048066672398102896) (by [@Professor_134](https://x.com/Professor_134))

| Output |
| :----: |
| <img src="./images/poster_case139/output.jpg" width="300" alt="Output image"> |

**Prompt:**

```
A cinematic, ultra-realistic night scene of a {argument name="artist" default="young male street artist"} painting a large-scale {argument name="mural subject" default="mural of a woman’s face"} in a {argument name="setting" default="narrow urban alley"}. The camera angle is slightly low, creating a dramatic, powerful perspective. The artist has medium-length, slightly messy dark hair and light stubble or a short beard, giving him a rugged, creative look.

He wears a loose white t-shirt and casual jeans, slightly oversized, with a relaxed streetwear vibe. His posture is focused and engaged as he stands close to the wall, actively spray-painting.

He is creating a massive, hyper-realistic mural of a woman’s face on a textured brick wall. The mural is incredibly detailed—smooth skin tones, realistic lighting, expressive eyes, and glossy lips—appearing almost like a photograph. Fine mist from the spray paint is visible in the air, catching light and adding motion and atmosphere.

The setting is a narrow urban alley at night, surrounded by tall buildings. The environment is gritty and textured—aged brick walls, paint splashes, subtle grime, and urban wear. Neon signs and distant streetlights cast vibrant reflections in teal, magenta, and blue tones, creating a cinematic, slightly cyberpunk mood.

Lighting is dramatic and layered: cool ambient light fills the alley, while warmer neon highlights create contrast. A subtle rim light outlines the artist’s silhouette, separating him from the dark background. The mural is partially illuminated, acting as a strong focal point.

Atmosphere includes light fog or mist, enhancing depth and making the lighting glow softly. The scene feels immersive, quiet, and artistically intense.

Depth of field is moderately shallow: the artist and mural are in sharp focus, while the background fades into soft blur with bokeh highlights.

Style: hyper-realistic, cinematic photography, street art aesthetic, ultra-detailed textures, high dynamic range, subtle film grain.

Camera details: 35mm or 50mm lens, f/1.8–f/2.8 aperture, low-light photography, slight low-angle shot, natural perspective.

Composition: vertical frame (4:5 or 9:16), subject slightly off-center, mural dominating the frame for strong visual storytelling.
Generate image using uploaded image as reference
```

<!-- Case 140: RPG Map to Anime Event Scene (by @ArtwlDesign) -->
### Case 140: [RPG Map to Anime Event Scene](https://x.com/ArtwlDesign/status/2048054726768709769) (by [@ArtwlDesign](https://x.com/ArtwlDesign))

| Output |
| :----: |
| <img src="./images/poster_case140/output.jpg" width="300" alt="Output image"> |

**Prompt:**

```
Using the provided reference image, transform the top-down RPG town map into a polished anime-style event illustration from a human eye-level perspective. Keep the same village location and layout cues: the central stone well, the path network, the hedges, the wooden houses, and the narrow water canal on the left. Convert the 2 small sprite characters by the well into 2 full-size fantasy characters in the foreground: a silver-haired mage in a purple robe holding a staff, and a blonde elf in green-and-brown adventurer clothing, both leaning over and looking into the well. Add a cinematic JRPG feel with soft daylight, detailed painterly rendering, clean line art, and gentle depth of field. Preserve the sense that this scene is taking place in the same town square, but enrich it with natural perspective, more environmental detail, and 5 background villagers: 1 man cropped at the far left edge, 2 small figures standing on the center path in the distance, and 2 townspeople talking near the right-side buildings.
```

<!-- Case 141: Soft Pastel Anime Girl Full Body (by @hoshi122221) -->
### Case 141: [Soft Pastel Anime Girl Full Body](https://x.com/hoshi122221/status/2048025730425196801) (by [@hoshi122221](https://x.com/hoshi122221))

| Output |
| :----: |
| <img src="./images/poster_case141/output.jpg" width="300" alt="Output image"> |

**Prompt:**

```
A full-body anime girl character design on a plain white background, centered and floating slightly, drawn in a soft minimalist pastel style with very thin gray linework and delicate flat colors. She has a petite youthful build and a cute, gentle silhouette, with special emphasis on a soft rounded face shape, smooth cheeks, and a softened jawline and chin. Her face is completely obscured by a blank skin-colored rectangular block with no facial features visible. She has short bob hair in {argument name="hair color" default="light ash brown"}, slightly tousled with wispy ends, long bangs covering part of the forehead, and a small ribbon hair tie on the right side in pale blue-gray. She wears 3 visible clothing pieces: an oversized pale blue cardigan with loose sleeves and front buttons, a cream-white slip dress with a scalloped neckline and a tiny button detail at the chest, and a frilled hem with a small ribbon near the right thigh. She is barefoot with slim pale legs, posed front-facing with both arms relaxed slightly outward, open hands, one leg straight and the other gently bent inward for a shy, weightless look. The illustration should feel airy, cute, understated, and clean, like a simple Japanese anime fashion sketch, with lots of negative space and no props, no shadows, and no background elements.
```

<!-- Case 142: Urban Fantasy Coexistence Crossing (by @Ray_CROWN0) -->
### Case 142: [Urban Fantasy Coexistence Crossing](https://x.com/Ray_CROWN0/status/2048024227664494775) (by [@Ray_CROWN0](https://x.com/Ray_CROWN0))

| Output |
| :----: |
| <img src="./images/poster_case142/output.jpg" width="300" alt="Output image"> |

**Prompt:**

```
A highly detailed anime-style urban fantasy illustration set at a busy Tokyo-style scramble crossing on a bright clear day, viewed at street level with a wide cinematic composition. The city blends modern realism with mythic fantasy: dense high-rise buildings covered in giant billboards, a red broadcast tower in the middle distance, blue sky with fluffy clouds, and a crowded crosswalk full of pedestrians. In the foreground, show 7 prominent character figures: a silver-haired elf woman in a flowing white dress holding an iced drink and tote bag on the far left; a central schoolgirl with long dark hair, black animal ears, a navy school blazer, plaid skirt, blue ribbon, and large navy shoulder bag, lifting one hand to her head; a young man in a dark suit looking down at a smartphone; an androgynous white-haired angelic figure in an elegant white-and-gold ceremonial outfit with large white wings; a small blonde girl in an ornate pastel pink frilled dress beside the angel; a dark-haired woman in a black coat in right foreground profile; and a small blue-haired cat-eared child in a blue dress with a bow standing near a cave entrance on the right. In the midground crowd, include mixed humans and fantasy races walking together naturally. Add 4 clearly visible nonhuman or supernatural background beings: 1 dragon flying in the sky, 1 winged female angel descending above the street, 1 lizard-headed businessman in a suit near the angelic figure, and 1 tall red-skinned horned demon with crossed arms standing by the hillside path. On the right side, transition the city into a lush shrine hillside with large green trees, a red torii gate, stone steps, and a wooden signboard reading Japanese kanji. Below it, place a rocky cave-like tunnel entrance glowing blue, with a wooden sign over the entrance and several figures descending into an underground shared district lit by crystals. Show 6 major billboard/sign elements across the cityscape: a huge left billboard reading "Shinpi Sekai 神秘世界" with a cosmic planet image; a large central political poster with Japanese text and a raised fist icon; 2 rooftop signs reading "未来研究所" on separate buildings; a large right billboard with Japanese text about coexistence and silhouettes of different beings; and 1 vertical banner with Japanese text on a nearby building. Emphasize the theme of coexistence between ordinary modern city life and hidden fantasy societies. Crisp anime linework, polished light novel key visual rendering, rich textures, soft sunlight, subtle atmospheric perspective, vibrant but believable colors, intricate clothing details, and a sense of awe, everyday bustle, and worldbuilding depth.
```

<!-- Case 161: Parent-Child Miscommunication Infographic (by @sarinaashapi) -->
### Case 161: [Parent-Child Miscommunication Infographic](https://x.com/sarinaashapi/status/2048307780864606708) (by [@sarinaashapi](https://x.com/sarinaashapi))

| Output |
| :----: |
| <img src="./images/poster_case161/output.jpg" width="300" alt="Output image"> |

**Prompt:**

```
{"type":"Japanese infographic","style":"simple, easy-to-understand flat vector diagram, clean white background, rounded light-gray outer frame, minimal pastel color palette, presentation-slide design, clear hierarchy, lots of whitespace, modern sans-serif Japanese typography","canvas":{"aspect_ratio":"16:9"},"headline":{"text":"{argument name=\"headline text\" default=\"親子のすれ違いは、記録があるかないかで起こる\"}","position":"top center","size":"large bold black"},"layout":{"structure":"2 side-by-side rounded panels beneath the headline","sections":[{"title":"記録がない場合(ズレる)","position":"left","count":8,"header_color":"muted blue-gray","panel_border":"light gray","labels":["親の記憶","子どもの記憶","あのとき決まったよね","まだ考えてたのに","ズレが大きくなる","志望校がコロコロ変わる","理由が『なんとなく』","言ってることが違う","関係がギクシャク","現実を見てほしい","ちゃんと決めてほしい","口を出しすぎると関係が悪くなる"],"contents":{"top_left":{"type":"parent icon with thought bubble","icon_color":"blue","caption":"親の記憶","bubble_text":"あのとき\n決まったよね"},"top_right":{"type":"child icon with thought bubble","icon_color":"pink","caption":"子どもの記憶","bubble_text":"まだ考えてたのに"},"center":{"type":"horizontal double-headed arrow","color":"blue-gray"},"bottom_center":{"type":"downward arrow leading to burst shape","color":"light gray","burst_text":"ズレが\n大きくなる"},"bottom_left":{"type":"rounded note box","bullet_count":4,"bullets":["志望校がコロコロ変わる","理由が『なんとなく』","言ってることが違う","関係がギクシャク"]},"bottom_right":{"type":"rounded note box","bullet_count":3,"bullets":["現実を見てほしい","ちゃんと決めてほしい","口を出しすぎると関係が悪くなる"]}}},{"title":"記録がある場合(ズレにくい)","position":"right","count":7,"header_color":"mustard yellow","panel_border":"light yellow","labels":["親の認識","子どもの認識","記録"],"contents":{"top_left":{"type":"parent icon with thought bubble containing document symbol","icon_color":"blue","caption":"親の認識"},"top_right":{"type":"child icon with thought bubble containing document symbol","icon_color":"pink","caption":"子どもの認識"},"center":{"type":"horizontal double-headed arrow","color":"mustard yellow"},"bottom_center":{"type":"circular record icon with document symbol","outline_color":"mustard yellow","text":"記録"},"bottom_left_connector":{"type":"curved arrow from parent to record","color":"blue"},"bottom_right_connector":{"type":"curved arrow from child to record","color":"pink"}}}],"spacing":"balanced, symmetrical"},"visual_language":{"icons":"generic human bust icons and simple document line icons","emphasis":"contrast the left panel's misunderstanding with the right panel's shared record","mood":"educational, calm, practical"},"text_language":"Japanese","render_quality":"crisp vector edges, infographic suitable for social media educational posts"}