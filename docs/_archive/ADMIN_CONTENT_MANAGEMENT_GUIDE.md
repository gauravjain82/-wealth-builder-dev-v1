> **ARCHIVED — a design proposal that was not built as specified. Do not treat it as a
> contract.**
>
> This is a backend database and API specification, written in April 2026 by reading the *old*
> site's code, to propose how admin-managed page content should be modelled. It describes ~30
> SQL tables and 18 endpoints under `/api/admin/pages/*`.
>
> **None of those 18 endpoints exists.** Nothing in this repo calls `/api/admin/pages/`. The
> content API that was actually built lives under `/api/content/`:
>
> | Consumed today | By |
> |---|---|
> | `/api/content/home-page/` | `home` |
> | `/api/content/file-vault/`, `/api/content/file-vault/items/` | `file-vault` |
> | `/api/content/training-center/`, `/items/`, `/progress/` | `training-center` |
> | `/api/content/admin/home-page`, `/admin/file-vault`, `/admin/training-center` | `admin` |
>
> The shape also differs: a `{page_key, updated_at, data}` envelope with full-replace `PUT`s
> was proposed; the built API is resource-oriented. Treat the table designs and the page-by-page
> content inventory as useful historical analysis of what each page needs, and nothing here as
> a description of the deployed schema.
>
> The authority on the real endpoints is `mlm_platform/docs/content/` in the backend repo.
> `docs/admin/API.md` will document the frontend's consumption of them when batch D is written.

---

﻿# Admin Content Management - Old Code Driven DB and API Document

## Goal
Define page-wise content model from old site code and provide:
- Database tables
- GET endpoints
- PUT endpoints

This document is implementation-focused for admin-managed content.

---

## Global API Rules

### Auth
- All endpoints require admin auth token.

### Method Scope
- GET: read current page configuration and content items.
- PUT: full update of page-level configuration (idempotent replace).

### Response Envelope
- GET/PUT success response shape:
  - page_key
  - updated_at
  - data

---

## Shared Tables

### 1) content_pages
- id (PK)
- page_key (unique) : home, insight_center, onboarding_game, track_my_license, licensing_documents, crash_course, systematic_tools, training_center, file_vault
- page_title
- is_active
- created_at
- updated_at

### 2) content_sections
- id (PK)
- page_id (FK -> content_pages.id)
- section_key
- section_title
- section_subtitle
- icon
- sort_order
- is_active
- visibility_plans_json
- visibility_roles_json
- created_at
- updated_at

### 3) content_resources
- id (PK)
- section_id (FK -> content_sections.id)
- resource_key
- title
- description
- resource_type : video, slide, pdf, doc, ppt, link, image, row
- url
- thumbnail_url
- metadata_json
- sort_order
- is_active
- created_at
- updated_at

### 4) content_assets
- id (PK)
- asset_key
- asset_type : image, video, icon
- url
- alt_text
- created_at
- updated_at

### 5) page_copy_blocks
- id (PK)
- page_id (FK -> content_pages.id)
- block_key
- value_text
- value_json
- updated_at

### 6) page_user_progress (for pages using progress)
- id (PK)
- page_key
- user_id
- progress_json
- completed_count
- last_opened_item_key
- updated_at

---

## Page 1 - Home

### Old code content observed
- Hero background image URL
- Trailer video URL
- Register URL
- Contest carousel images
- Recognition carousel images
- Leaderboard tabs and rows
- Performance metrics cards

### Page-specific tables

#### home_config
- id (PK)
- page_id (FK)
- background_image_url
- trailer_video_url
- register_url
- avatar_url
- hero_title
- hero_subtitle
- updated_at

#### home_carousel_items
- id (PK)
- page_id (FK)
- carousel_type : contest, recognition
- title
- image_url
- sort_order
- is_active
- updated_at

#### home_leaderboard_items
- id (PK)
- page_id (FK)
- board_type : bp, pt, lic, cv
- rank_group : smd, md
- rank_no
- display_name
- value_number
- updated_at

### Endpoints
- GET /api/admin/pages/home
- PUT /api/admin/pages/home

---

## Page 2 - Insight Center

### Old code content observed
- Intro video (mainIntro)
- Easter egg video
- Heading/subtitle text
- Two CTA buttons (business/education)

### Page-specific tables

#### insight_center_config
- id (PK)
- page_id (FK)
- intro_video_url
- easter_egg_video_url
- heading_text
- subtitle_text
- logo_image_url
- updated_at

#### insight_center_cta_buttons
- id (PK)
- page_id (FK)
- label
- route_path
- aria_label
- sort_order
- is_active
- updated_at

### Endpoints
- GET /api/admin/pages/insight-center
- PUT /api/admin/pages/insight-center

---

## Page 3 - Onboarding Game

### Old code content observed
- Sections: start/philosophy/followSystem/buildOutlet
- Modules m0..m11
- Free and paid video mappings
- Road/badge assets
- Tracker-linked milestone values

### Page-specific tables

#### onboarding_game_config
- id (PK)
- page_id (FK)
- road_image_url
- car_image_url
- shield_image_url
- shirt_image_url
- watch_image_url
- smd_badge_image_url
- start_image_url
- traffic_green_image_url
- traffic_red_image_url
- updated_at

#### onboarding_sections
- id (PK)
- page_id (FK)
- section_key : start, philosophy, followSystem, buildOutlet
- title
- badge_image_url
- sort_order
- is_active
- updated_at

#### onboarding_modules
- id (PK)
- page_id (FK)
- module_key : m0..m11
- module_title
- section_key
- position_index
- threshold_value
- threshold_type : boolean, number
- is_active
- updated_at

#### onboarding_module_videos
- id (PK)
- module_id (FK -> onboarding_modules.id)
- audience_tier : free, paid
- title
- video_url
- description
- sort_order
- is_active
- updated_at

### Endpoints
- GET /api/admin/pages/onboarding-game
- PUT /api/admin/pages/onboarding-game

---

## Page 4 - Licensing / Track My License

### Old code content observed
- Chapter progression (ch1..ch14)
- VIDEO_LIST and chapter-to-video distribution
- Header/subtitle text
- Local progress persistence

### Page-specific tables

#### track_license_config
- id (PK)
- page_id (FK)
- page_title
- page_subtitle
- bot_image_url
- storage_key
- updated_at

#### track_license_chapters
- id (PK)
- page_id (FK)
- chapter_key : ch1..ch14
- chapter_title
- sort_order
- unlock_rule_json
- is_active
- updated_at

#### track_license_chapter_videos
- id (PK)
- chapter_id (FK)
- title
- video_url
- sort_order
- is_active
- updated_at

### Endpoints
- GET /api/admin/pages/licensing/track-my-license
- PUT /api/admin/pages/licensing/track-my-license

---

## Page 5 - Licensing / Licensing Documents

### Old code content observed
- 3 document cards with title/desc/href

### Page-specific tables

#### licensing_documents_config
- id (PK)
- page_id (FK)
- page_title
- page_subtitle
- updated_at

#### licensing_documents_items
- id (PK)
- page_id (FK)
- doc_key
- title
- description
- url
- resource_type : sheet, slide, pdf, link
- sort_order
- is_active
- updated_at

### Endpoints
- GET /api/admin/pages/licensing/documents
- PUT /api/admin/pages/licensing/documents

---

## Page 6 - Licensing / Crash Course

### Old code content observed
- Course object (title/poster/main video)
- Modules m1..m5
- Videos v01..v23 inside modules
- Local storage progress keys

### Page-specific tables

#### crash_course_config
- id (PK)
- page_id (FK)
- course_key
- course_title
- main_video_url
- poster_url
- storage_module_progress_key
- storage_history_key
- updated_at

#### crash_course_modules
- id (PK)
- page_id (FK)
- module_key
- module_title
- cover_image_url
- sort_order
- is_active
- updated_at

#### crash_course_module_videos
- id (PK)
- module_id (FK)
- video_key
- video_title
- duration_min
- video_url
- sort_order
- is_active
- updated_at

### Endpoints
- GET /api/admin/pages/licensing/crash-course
- PUT /api/admin/pages/licensing/crash-course

---

## Page 7 - 10 Systematic Tools

### Old code content observed
- DEFAULT_MENU with gateIndex and item lists
- Section options with slide/pdf/video routes
- Plan-based access matrix
- Admin edit mode persists to localStorage

### Page-specific tables

#### systematic_tools_config
- id (PK)
- page_id (FK)
- page_title
- menu_storage_key
- updated_at

#### systematic_tools_sections
- id (PK)
- page_id (FK)
- section_key
- label
- gate_index
- icon
- sort_order
- is_active
- updated_at

#### systematic_tools_items
- id (PK)
- section_id (FK)
- title
- resource_type : slide, pdf, video, route, custom_modal
- embed_url
- route_path
- modal_key
- thumbnail_url
- sort_order
- is_active
- updated_at

#### systematic_tools_access_rules
- id (PK)
- section_id (FK)
- plan_name
- is_allowed
- updated_at

### Endpoints
- GET /api/admin/pages/systematic-tools
- PUT /api/admin/pages/systematic-tools

---

## Page 8 - Training Center

### Old code content observed
- TRAINING_DATA array of sections and many items
- Each item includes title/href/xp
- Plan normalization in page code

### Page-specific tables

#### training_center_config
- id (PK)
- page_id (FK)
- page_title
- page_subtitle
- updated_at

#### training_center_sections
- id (PK)
- page_id (FK)
- section_key
- label
- icon
- sort_order
- is_active
- updated_at

#### training_center_items
- id (PK)
- section_id (FK)
- item_key
- title
- href
- xp
- resource_type : link, video, pdf, doc, ppt
- sort_order
- is_active
- updated_at

### Endpoints
- GET /api/admin/pages/training-center
- PUT /api/admin/pages/training-center

---

## Page 9 - File Vault

### Old code content observed
- VAULT_DATA sections and items
- Item styles: row or card (thumb)
- Plan filter for New Agent

### Page-specific tables

#### file_vault_config
- id (PK)
- page_id (FK)
- page_title
- search_enabled
- updated_at

#### file_vault_sections
- id (PK)
- page_id (FK)
- section_key
- label
- icon
- sort_order
- is_active
- updated_at

#### file_vault_items
- id (PK)
- section_id (FK)
- title
- href
- item_view_type : row, card
- thumbnail_url
- resource_type : link, video, pdf, doc, ppt, image
- sort_order
- is_active
- updated_at

#### file_vault_plan_rules
- id (PK)
- page_id (FK)
- plan_name
- rule_json
- updated_at

### Endpoints
- GET /api/admin/pages/file-vault
- PUT /api/admin/pages/file-vault

---

## Consolidated Endpoint List (GET/PUT Only)
- GET /api/admin/pages/home
- PUT /api/admin/pages/home
- GET /api/admin/pages/insight-center
- PUT /api/admin/pages/insight-center
- GET /api/admin/pages/onboarding-game
- PUT /api/admin/pages/onboarding-game
- GET /api/admin/pages/licensing/track-my-license
- PUT /api/admin/pages/licensing/track-my-license
- GET /api/admin/pages/licensing/documents
- PUT /api/admin/pages/licensing/documents
- GET /api/admin/pages/licensing/crash-course
- PUT /api/admin/pages/licensing/crash-course
- GET /api/admin/pages/systematic-tools
- PUT /api/admin/pages/systematic-tools
- GET /api/admin/pages/training-center
- PUT /api/admin/pages/training-center
- GET /api/admin/pages/file-vault
- PUT /api/admin/pages/file-vault

---

## PUT Contract Rule
Each PUT endpoint accepts the full page payload and replaces existing page config atomically.

Recommended validation:
- URL format validation for all links/videos/files
- Required title and key fields
- Unique sort_order within each section scope
- Plan names must match allowed plan enum

---

## Sample JSON Payloads

---

### Page 1 - Home

#### GET /api/admin/pages/home — Response
```json
{
  "page_key": "home",
  "updated_at": "2026-04-25T10:00:00Z",
  "data": {
    "config": {
      "background_image_url": "https://cdn.example.com/hero-bg.jpg",
      "trailer_video_url": "https://cdn.example.com/trailer.mp4",
      "register_url": "https://events.example.com/register",
      "avatar_url": "https://cdn.example.com/avatar.png",
      "hero_title": "Build Your Wealth",
      "hero_subtitle": "Join thousands of successful agents"
    },
    "carousel_items": [
      {
        "id": 1,
        "carousel_type": "contest",
        "title": "Summer Contest 2026",
        "image_url": "https://cdn.example.com/contest1.jpg",
        "sort_order": 1,
        "is_active": true
      },
      {
        "id": 2,
        "carousel_type": "recognition",
        "title": "Top Agent Award",
        "image_url": "https://cdn.example.com/recognition1.jpg",
        "sort_order": 1,
        "is_active": true
      }
    ],
    "leaderboard_items": [
      {
        "id": 1,
        "board_type": "bp",
        "rank_group": "smd",
        "rank_no": 1,
        "display_name": "Jane Doe",
        "value_number": 120000
      }
    ]
  }
}
```

#### PUT /api/admin/pages/home — Request Body
```json
{
  "config": {
    "background_image_url": "https://cdn.example.com/hero-bg-new.jpg",
    "trailer_video_url": "https://cdn.example.com/trailer-new.mp4",
    "register_url": "https://events.example.com/register-2026",
    "avatar_url": "https://cdn.example.com/avatar.png",
    "hero_title": "Build Your Wealth Today",
    "hero_subtitle": "Join thousands of successful agents"
  },
  "carousel_items": [
    {
      "carousel_type": "contest",
      "title": "Fall Contest 2026",
      "image_url": "https://cdn.example.com/contest2.jpg",
      "sort_order": 1,
      "is_active": true
    }
  ],
  "leaderboard_items": [
    {
      "board_type": "bp",
      "rank_group": "smd",
      "rank_no": 1,
      "display_name": "Jane Doe",
      "value_number": 135000
    }
  ]
}
```

#### PUT /api/admin/pages/home — Response
```json
{
  "page_key": "home",
  "updated_at": "2026-04-25T11:00:00Z",
  "data": { "status": "updated" }
}
```

---

### Page 2 - Insight Center

#### GET /api/admin/pages/insight-center — Response
```json
{
  "page_key": "insight_center",
  "updated_at": "2026-04-25T10:00:00Z",
  "data": {
    "config": {
      "intro_video_url": "https://cdn.example.com/insight-intro.mp4",
      "easter_egg_video_url": "https://cdn.example.com/easter-egg.mp4",
      "heading_text": "Welcome to Insight Center",
      "subtitle_text": "Your hub for growth and knowledge",
      "logo_image_url": "https://cdn.example.com/logo.png"
    },
    "cta_buttons": [
      {
        "id": 1,
        "label": "Business Center",
        "route_path": "/business",
        "aria_label": "Go to Business Center",
        "sort_order": 1,
        "is_active": true
      },
      {
        "id": 2,
        "label": "Education Center",
        "route_path": "/education",
        "aria_label": "Go to Education Center",
        "sort_order": 2,
        "is_active": true
      }
    ]
  }
}
```

#### PUT /api/admin/pages/insight-center — Request Body
```json
{
  "config": {
    "intro_video_url": "https://cdn.example.com/insight-intro-v2.mp4",
    "easter_egg_video_url": "https://cdn.example.com/easter-egg-v2.mp4",
    "heading_text": "Welcome to Insight Center",
    "subtitle_text": "Updated subtitle text",
    "logo_image_url": "https://cdn.example.com/logo-v2.png"
  },
  "cta_buttons": [
    {
      "label": "Business Center",
      "route_path": "/business",
      "aria_label": "Go to Business Center",
      "sort_order": 1,
      "is_active": true
    },
    {
      "label": "Education Center",
      "route_path": "/education",
      "aria_label": "Go to Education Center",
      "sort_order": 2,
      "is_active": true
    }
  ]
}
```

---

### Page 3 - Onboarding Game

#### GET /api/admin/pages/onboarding-game — Response
```json
{
  "page_key": "onboarding_game",
  "updated_at": "2026-04-25T10:00:00Z",
  "data": {
    "config": {
      "road_image_url": "/road.png",
      "car_image_url": "/car.png",
      "shield_image_url": "/shield.png",
      "shirt_image_url": "/shirt.png",
      "watch_image_url": "/watch.png",
      "smd_badge_image_url": "/smd100k.png",
      "start_image_url": "/start.png",
      "traffic_green_image_url": "/traffic-light-green.png",
      "traffic_red_image_url": "/traffic-light-red.png"
    },
    "sections": [
      {
        "id": 1,
        "section_key": "start",
        "title": "Get Started",
        "badge_image_url": "/start.png",
        "sort_order": 1,
        "is_active": true
      }
    ],
    "modules": [
      {
        "id": 1,
        "module_key": "m0",
        "module_title": "Intro",
        "section_key": "start",
        "position_index": 0,
        "threshold_value": 1,
        "threshold_type": "boolean",
        "is_active": true,
        "videos": [
          {
            "id": 1,
            "audience_tier": "free",
            "title": "Welcome Video",
            "video_url": "https://cdn.example.com/intro.mp4",
            "description": "Introduction to the program",
            "sort_order": 1,
            "is_active": true
          }
        ]
      }
    ]
  }
}
```

#### PUT /api/admin/pages/onboarding-game — Request Body
```json
{
  "config": {
    "road_image_url": "/road.png",
    "car_image_url": "/car.png",
    "shield_image_url": "/shield.png",
    "shirt_image_url": "/shirt.png",
    "watch_image_url": "/watch.png",
    "smd_badge_image_url": "/smd100k.png",
    "start_image_url": "/start.png",
    "traffic_green_image_url": "/traffic-light-green.png",
    "traffic_red_image_url": "/traffic-light-red.png"
  },
  "sections": [
    {
      "section_key": "start",
      "title": "Get Started",
      "badge_image_url": "/start.png",
      "sort_order": 1,
      "is_active": true
    },
    {
      "section_key": "philosophy",
      "title": "Philosophy",
      "badge_image_url": "/shield.png",
      "sort_order": 2,
      "is_active": true
    }
  ],
  "modules": [
    {
      "module_key": "m0",
      "module_title": "Intro",
      "section_key": "start",
      "position_index": 0,
      "threshold_value": 1,
      "threshold_type": "boolean",
      "is_active": true,
      "videos": [
        {
          "audience_tier": "free",
          "title": "Welcome Video",
          "video_url": "https://cdn.example.com/intro.mp4",
          "description": "Introduction to the program",
          "sort_order": 1,
          "is_active": true
        },
        {
          "audience_tier": "paid",
          "title": "Welcome Video (Full)",
          "video_url": "https://cdn.example.com/intro-paid.mp4",
          "description": "Full introduction for paid members",
          "sort_order": 2,
          "is_active": true
        }
      ]
    }
  ]
}
```

---

### Page 4 - Licensing / Track My License

#### GET /api/admin/pages/licensing/track-my-license — Response
```json
{
  "page_key": "track_my_license",
  "updated_at": "2026-04-25T10:00:00Z",
  "data": {
    "config": {
      "page_title": "Track My License",
      "page_subtitle": "Complete all chapters to earn your license",
      "bot_image_url": "/bot.png",
      "storage_key": "licenseProgress"
    },
    "chapters": [
      {
        "id": 1,
        "chapter_key": "ch1",
        "chapter_title": "Chapter 1 - Foundations",
        "sort_order": 1,
        "unlock_rule_json": { "requires_previous": false },
        "is_active": true,
        "videos": [
          {
            "id": 1,
            "title": "Foundations Intro",
            "video_url": "https://cdn.example.com/ch1-v1.mp4",
            "sort_order": 1,
            "is_active": true
          }
        ]
      }
    ]
  }
}
```

#### PUT /api/admin/pages/licensing/track-my-license — Request Body
```json
{
  "config": {
    "page_title": "Track My License",
    "page_subtitle": "Complete all 14 chapters",
    "bot_image_url": "/bot-v2.png",
    "storage_key": "licenseProgress"
  },
  "chapters": [
    {
      "chapter_key": "ch1",
      "chapter_title": "Chapter 1 - Foundations",
      "sort_order": 1,
      "unlock_rule_json": { "requires_previous": false },
      "is_active": true,
      "videos": [
        {
          "title": "Foundations Intro",
          "video_url": "https://cdn.example.com/ch1-v1.mp4",
          "sort_order": 1,
          "is_active": true
        }
      ]
    },
    {
      "chapter_key": "ch2",
      "chapter_title": "Chapter 2 - Compliance",
      "sort_order": 2,
      "unlock_rule_json": { "requires_previous": true, "previous_key": "ch1" },
      "is_active": true,
      "videos": [
        {
          "title": "Compliance Overview",
          "video_url": "https://cdn.example.com/ch2-v1.mp4",
          "sort_order": 1,
          "is_active": true
        }
      ]
    }
  ]
}
```

---

### Page 5 - Licensing / Licensing Documents

#### GET /api/admin/pages/licensing/documents — Response
```json
{
  "page_key": "licensing_documents",
  "updated_at": "2026-04-25T10:00:00Z",
  "data": {
    "config": {
      "page_title": "Licensing Documents",
      "page_subtitle": "Access all required licensing materials"
    },
    "documents": [
      {
        "id": 1,
        "doc_key": "pre_licensing_study",
        "title": "Pre-Licensing Study Guide",
        "description": "Comprehensive guide to prepare for your exam",
        "url": "https://docs.example.com/pre-licensing.pdf",
        "resource_type": "pdf",
        "sort_order": 1,
        "is_active": true
      },
      {
        "id": 2,
        "doc_key": "licensing_checklist",
        "title": "Licensing Checklist",
        "description": "Step-by-step checklist for new agents",
        "url": "https://docs.example.com/checklist.sheet",
        "resource_type": "sheet",
        "sort_order": 2,
        "is_active": true
      }
    ]
  }
}
```

#### PUT /api/admin/pages/licensing/documents — Request Body
```json
{
  "config": {
    "page_title": "Licensing Documents",
    "page_subtitle": "Access all required licensing materials"
  },
  "documents": [
    {
      "doc_key": "pre_licensing_study",
      "title": "Pre-Licensing Study Guide",
      "description": "Comprehensive guide to prepare for your exam",
      "url": "https://docs.example.com/pre-licensing-v2.pdf",
      "resource_type": "pdf",
      "sort_order": 1,
      "is_active": true
    },
    {
      "doc_key": "licensing_checklist",
      "title": "Licensing Checklist",
      "description": "Step-by-step checklist for new agents",
      "url": "https://docs.example.com/checklist.sheet",
      "resource_type": "sheet",
      "sort_order": 2,
      "is_active": true
    },
    {
      "doc_key": "exam_prep_slides",
      "title": "Exam Prep Slides",
      "description": "Slide deck for exam preparation",
      "url": "https://docs.example.com/exam-prep.pptx",
      "resource_type": "slide",
      "sort_order": 3,
      "is_active": true
    }
  ]
}
```

---

### Page 6 - Licensing / Crash Course

#### GET /api/admin/pages/licensing/crash-course — Response
```json
{
  "page_key": "crash_course",
  "updated_at": "2026-04-25T10:00:00Z",
  "data": {
    "config": {
      "course_key": "license_crash_course",
      "course_title": "License Crash Course",
      "main_video_url": "https://cdn.example.com/crash-intro.mp4",
      "poster_url": "https://cdn.example.com/crash-poster.jpg",
      "storage_module_progress_key": "ccModuleProgress",
      "storage_history_key": "ccHistory"
    },
    "modules": [
      {
        "id": 1,
        "module_key": "m1",
        "module_title": "Module 1 - Overview",
        "cover_image_url": "https://cdn.example.com/m1-cover.jpg",
        "sort_order": 1,
        "is_active": true,
        "videos": [
          {
            "id": 1,
            "video_key": "v01",
            "video_title": "Introduction",
            "duration_min": 8,
            "video_url": "https://cdn.example.com/cc-m1-v01.mp4",
            "sort_order": 1,
            "is_active": true
          }
        ]
      }
    ]
  }
}
```

#### PUT /api/admin/pages/licensing/crash-course — Request Body
```json
{
  "config": {
    "course_key": "license_crash_course",
    "course_title": "License Crash Course",
    "main_video_url": "https://cdn.example.com/crash-intro-v2.mp4",
    "poster_url": "https://cdn.example.com/crash-poster-v2.jpg",
    "storage_module_progress_key": "ccModuleProgress",
    "storage_history_key": "ccHistory"
  },
  "modules": [
    {
      "module_key": "m1",
      "module_title": "Module 1 - Overview",
      "cover_image_url": "https://cdn.example.com/m1-cover.jpg",
      "sort_order": 1,
      "is_active": true,
      "videos": [
        {
          "video_key": "v01",
          "video_title": "Introduction",
          "duration_min": 8,
          "video_url": "https://cdn.example.com/cc-m1-v01.mp4",
          "sort_order": 1,
          "is_active": true
        },
        {
          "video_key": "v02",
          "video_title": "Core Concepts",
          "duration_min": 12,
          "video_url": "https://cdn.example.com/cc-m1-v02.mp4",
          "sort_order": 2,
          "is_active": true
        }
      ]
    }
  ]
}
```

---

### Page 7 - 10 Systematic Tools

#### GET /api/admin/pages/systematic-tools — Response
```json
{
  "page_key": "systematic_tools",
  "updated_at": "2026-04-25T10:00:00Z",
  "data": {
    "config": {
      "page_title": "10 Systematic Tools",
      "menu_storage_key": "tenTools:menu"
    },
    "sections": [
      {
        "id": 1,
        "section_key": "tool_1",
        "label": "Field Training",
        "gate_index": 0,
        "icon": "briefcase",
        "sort_order": 1,
        "is_active": true,
        "access_rules": [
          { "plan_name": "basic", "is_allowed": true },
          { "plan_name": "premium", "is_allowed": true }
        ],
        "items": [
          {
            "id": 1,
            "title": "Field Training Guide",
            "resource_type": "pdf",
            "embed_url": null,
            "route_path": null,
            "modal_key": null,
            "thumbnail_url": "https://cdn.example.com/thumb-ft.jpg",
            "sort_order": 1,
            "is_active": true
          }
        ]
      }
    ]
  }
}
```

#### PUT /api/admin/pages/systematic-tools — Request Body
```json
{
  "config": {
    "page_title": "10 Systematic Tools",
    "menu_storage_key": "tenTools:menu"
  },
  "sections": [
    {
      "section_key": "tool_1",
      "label": "Field Training",
      "gate_index": 0,
      "icon": "briefcase",
      "sort_order": 1,
      "is_active": true,
      "access_rules": [
        { "plan_name": "basic", "is_allowed": true },
        { "plan_name": "premium", "is_allowed": true }
      ],
      "items": [
        {
          "title": "Field Training Guide",
          "resource_type": "pdf",
          "embed_url": null,
          "route_path": null,
          "modal_key": null,
          "thumbnail_url": "https://cdn.example.com/thumb-ft.jpg",
          "sort_order": 1,
          "is_active": true
        },
        {
          "title": "Field Training Video",
          "resource_type": "video",
          "embed_url": "https://cdn.example.com/ft-video.mp4",
          "route_path": null,
          "modal_key": null,
          "thumbnail_url": "https://cdn.example.com/thumb-ftv.jpg",
          "sort_order": 2,
          "is_active": true
        }
      ]
    }
  ]
}
```

---

### Page 8 - Training Center

#### GET /api/admin/pages/training-center — Response
```json
{
  "page_key": "training_center",
  "updated_at": "2026-04-25T10:00:00Z",
  "data": {
    "config": {
      "page_title": "Training Center",
      "page_subtitle": "Level up your skills"
    },
    "sections": [
      {
        "id": 1,
        "section_key": "basics",
        "label": "Basics",
        "icon": "book",
        "sort_order": 1,
        "is_active": true,
        "items": [
          {
            "id": 1,
            "item_key": "basics_item_1",
            "title": "Getting Started Guide",
            "href": "https://training.example.com/getting-started",
            "xp": 50,
            "resource_type": "link",
            "sort_order": 1,
            "is_active": true
          }
        ]
      }
    ]
  }
}
```

#### PUT /api/admin/pages/training-center — Request Body
```json
{
  "config": {
    "page_title": "Training Center",
    "page_subtitle": "Level up your skills and earn XP"
  },
  "sections": [
    {
      "section_key": "basics",
      "label": "Basics",
      "icon": "book",
      "sort_order": 1,
      "is_active": true,
      "items": [
        {
          "item_key": "basics_item_1",
          "title": "Getting Started Guide",
          "href": "https://training.example.com/getting-started",
          "xp": 50,
          "resource_type": "link",
          "sort_order": 1,
          "is_active": true
        },
        {
          "item_key": "basics_item_2",
          "title": "Sales Fundamentals Video",
          "href": "https://cdn.example.com/sales-fundamentals.mp4",
          "xp": 100,
          "resource_type": "video",
          "sort_order": 2,
          "is_active": true
        }
      ]
    }
  ]
}
```

---

### Page 9 - File Vault

#### GET /api/admin/pages/file-vault — Response
```json
{
  "page_key": "file_vault",
  "updated_at": "2026-04-25T10:00:00Z",
  "data": {
    "config": {
      "page_title": "File Vault",
      "search_enabled": true
    },
    "sections": [
      {
        "id": 1,
        "section_key": "marketing_materials",
        "label": "Marketing Materials",
        "icon": "folder",
        "sort_order": 1,
        "is_active": true,
        "items": [
          {
            "id": 1,
            "title": "Brand Guidelines",
            "href": "https://docs.example.com/brand-guidelines.pdf",
            "item_view_type": "card",
            "thumbnail_url": "https://cdn.example.com/brand-thumb.jpg",
            "resource_type": "pdf",
            "sort_order": 1,
            "is_active": true
          }
        ]
      }
    ],
    "plan_rules": [
      {
        "plan_name": "new_agent",
        "rule_json": { "allowed_section_keys": ["marketing_materials"] }
      }
    ]
  }
}
```

#### PUT /api/admin/pages/file-vault — Request Body
```json
{
  "config": {
    "page_title": "File Vault",
    "search_enabled": true
  },
  "sections": [
    {
      "section_key": "marketing_materials",
      "label": "Marketing Materials",
      "icon": "folder",
      "sort_order": 1,
      "is_active": true,
      "items": [
        {
          "title": "Brand Guidelines",
          "href": "https://docs.example.com/brand-guidelines-v2.pdf",
          "item_view_type": "card",
          "thumbnail_url": "https://cdn.example.com/brand-thumb.jpg",
          "resource_type": "pdf",
          "sort_order": 1,
          "is_active": true
        },
        {
          "title": "Social Media Templates",
          "href": "https://docs.example.com/social-templates.zip",
          "item_view_type": "row",
          "thumbnail_url": null,
          "resource_type": "link",
          "sort_order": 2,
          "is_active": true
        }
      ]
    }
  ],
  "plan_rules": [
    {
      "plan_name": "new_agent",
      "rule_json": { "allowed_section_keys": ["marketing_materials"] }
    },
    {
      "plan_name": "premium",
      "rule_json": { "allowed_section_keys": ["marketing_materials", "advanced_tools"] }
    }
  ]
}
```
