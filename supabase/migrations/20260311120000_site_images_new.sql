-- Register new site images added March 2026 (all converted to WebP, hosted on R2)
-- Run in Supabase dashboard SQL editor

DO $$
DECLARE
    folder_id uuid;
BEGIN
    -- Get the existing "site" folder id
    SELECT id INTO folder_id FROM media_folders WHERE slug = 'site' AND parent_id IS NULL;

    IF folder_id IS NULL THEN
        INSERT INTO media_folders (name, slug, path, parent_id)
        VALUES ('site', 'site', 'site', NULL)
        RETURNING id INTO folder_id;
    END IF;

    INSERT INTO media_items (folder_id, filename, original_filename, title, mime_type, file_size, storage_path, url, url_large, url_medium, url_thumb)
    VALUES
        (folder_id,
         'Award-ElderCare-Review-Senior-Living-Advisory-Services-Provider-2025.webp',
         'Award-ElderCare-Review-Senior-Living-Advisory-Services-Provider-2025.png',
         'ElderCare Review — Senior Living Advisory Services Provider 2025',
         'image/webp', 87982,
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Award-ElderCare-Review-Senior-Living-Advisory-Services-Provider-2025.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Award-ElderCare-Review-Senior-Living-Advisory-Services-Provider-2025.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Award-ElderCare-Review-Senior-Living-Advisory-Services-Provider-2025-500x500.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Award-ElderCare-Review-Senior-Living-Advisory-Services-Provider-2025-200x200.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Award-ElderCare-Review-Senior-Living-Advisory-Services-Provider-2025-100x100.webp'),

        (folder_id,
         'Award-ElderCare-Review-Senior-Placement-Company-of-the-Year-2025.webp',
         'Award-ElderCare-Review-Senior-Placement-Company-of-the-Year-2025.png',
         'ElderCare Review — Senior Placement Company of the Year 2025',
         'image/webp', 59876,
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Award-ElderCare-Review-Senior-Placement-Company-of-the-Year-2025.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Award-ElderCare-Review-Senior-Placement-Company-of-the-Year-2025.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Award-ElderCare-Review-Senior-Placement-Company-of-the-Year-2025-500x500.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Award-ElderCare-Review-Senior-Placement-Company-of-the-Year-2025-200x200.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Award-ElderCare-Review-Senior-Placement-Company-of-the-Year-2025-100x100.webp'),

        (folder_id,
         'Award-SEO-Views-Innovator-of-the-Year-2025.webp',
         'Award-SEO-Views-Innovator-of-the-Year-2025.png',
         'SEO Views — Innovator of the Year 2025',
         'image/webp', 56150,
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Award-SEO-Views-Innovator-of-the-Year-2025.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Award-SEO-Views-Innovator-of-the-Year-2025.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Award-SEO-Views-Innovator-of-the-Year-2025-500x500.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Award-SEO-Views-Innovator-of-the-Year-2025-200x200.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Award-SEO-Views-Innovator-of-the-Year-2025-100x100.webp'),

        (folder_id,
         'ECF_Rose-couple-consultation-edited-by-Rose_02.17.25_RG-scaled.webp',
         'ECF_Rose-couple-consultation-edited-by-Rose_02.17.25_RG-scaled.jpg',
         'Rose — Couple Consultation',
         'image/webp', 275144,
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/ECF_Rose-couple-consultation-edited-by-Rose_02.17.25_RG-scaled.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/ECF_Rose-couple-consultation-edited-by-Rose_02.17.25_RG-scaled.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/ECF_Rose-couple-consultation-edited-by-Rose_02.17.25_RG-scaled-500x500.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/ECF_Rose-couple-consultation-edited-by-Rose_02.17.25_RG-scaled-200x200.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/ECF_Rose-couple-consultation-edited-by-Rose_02.17.25_RG-scaled-100x100.webp'),

        (folder_id,
         'ECF_Rose-next-to-computer_edited-by-Rose_02.17.25_RGa-scaled.webp',
         'ECF_Rose-next-to-computer_edited-by-Rose_02.17.25_RGa-scaled.jpg',
         'Rose — Next to Computer',
         'image/webp', 337090,
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/ECF_Rose-next-to-computer_edited-by-Rose_02.17.25_RGa-scaled.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/ECF_Rose-next-to-computer_edited-by-Rose_02.17.25_RGa-scaled.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/ECF_Rose-next-to-computer_edited-by-Rose_02.17.25_RGa-scaled-500x500.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/ECF_Rose-next-to-computer_edited-by-Rose_02.17.25_RGa-scaled-200x200.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/ECF_Rose-next-to-computer_edited-by-Rose_02.17.25_RGa-scaled-100x100.webp'),

        (folder_id,
         'Elite-CareFinders_Cover-2025a.webp',
         'Elite-CareFinders_Cover-2025a.webp',
         'Elite CareFinders Cover 2025',
         'image/webp', 547612,
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Elite-CareFinders_Cover-2025a.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Elite-CareFinders_Cover-2025a.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Elite-CareFinders_Cover-2025a-500x500.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Elite-CareFinders_Cover-2025a-200x200.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Elite-CareFinders_Cover-2025a-100x100.webp'),

        (folder_id,
         'Rose-10-25.webp',
         'Rose-10-25.jpg',
         'Rose — Portrait (Oct 2025)',
         'image/webp', 239404,
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Rose-10-25.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Rose-10-25.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Rose-10-25-500x500.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Rose-10-25-200x200.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Rose-10-25-100x100.webp'),

        (folder_id,
         'Rose-for-web.webp',
         'Rose-for-web.jpg',
         'Rose — Web Portrait',
         'image/webp', 201654,
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Rose-for-web.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Rose-for-web.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Rose-for-web-500x500.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Rose-for-web-200x200.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/Rose-for-web-100x100.webp'),

        (folder_id,
         'hibiscus-bg2.svg',
         'hibiscus-bg2.svg',
         'Hibiscus BG 2',
         'image/svg+xml', 22239,
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/hibiscus-bg2.svg',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/hibiscus-bg2.svg',
         NULL, NULL, NULL),

        (folder_id,
         'hibiscus-bg3.svg',
         'hibiscus-bg3.svg',
         'Hibiscus BG 3',
         'image/svg+xml', 22240,
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/hibiscus-bg3.svg',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/hibiscus-bg3.svg',
         NULL, NULL, NULL),

        (folder_id,
         'hibiscus-bg4.svg',
         'hibiscus-bg4.svg',
         'Hibiscus BG 4',
         'image/svg+xml', 21641,
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/hibiscus-bg4.svg',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/hibiscus-bg4.svg',
         NULL, NULL, NULL),

        (folder_id,
         'hibiscus-bg5.svg',
         'hibiscus-bg5.svg',
         'Hibiscus BG 5',
         'image/svg+xml', 21465,
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/hibiscus-bg5.svg',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/hibiscus-bg5.svg',
         NULL, NULL, NULL),

        (folder_id,
         'login-bg.webp',
         'login-bg.jpg',
         'Login Background',
         'image/webp', 227648,
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/login-bg.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/login-bg.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/login-bg-500x500.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/login-bg-200x200.webp',
         'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/login-bg-100x100.webp')

    ON CONFLICT DO NOTHING;
END $$;
