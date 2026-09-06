-- 시술 안내 영상이 아직 업로드되지 않은 상태(환자 화면 폴백)를 표현하기 위해
-- video_url을 nullable로 변경. seed.sql의 예시(placeholder) URL도 null로 정리.

alter table procedure_videos alter column video_url drop not null;

update procedure_videos set video_url = null
where video_url = 'https://example.com/videos/face-lift-intro.mp4';
