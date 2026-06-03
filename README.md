# Jarvis

Jarvis is a personal LAN dashboard for links, categories, and notes. It has a login-protected admin panel, automatic site metadata fetching, collapsible categories on the home page, and built-in backup export/import.

## Features

- Group services into categories such as planes, monitoring, media, automation, or anything else you want.
- Add, edit, delete, and reorder categories in the admin panel.
- Add services with a URL and let the app fetch the title and favicon automatically.
- Create a new category while adding a service if the category does not already exist.
- Add notes and announcements.
- Export and import full dashboard backups from the admin panel.
- Change branding, fonts, colours, layout columns, and compact mode.

## Quick Start

```bash
docker compose up -d
```

Then open `http://localhost:3000` or `http://your-server-ip:3000` in your browser.

Default credentials:

- Username: `admin`
- Password: `admin`

Change them in the admin panel after the first login.

## Admin Panel

Open the admin panel from the top-right corner of the page.

Tabs available:

- Services: add and edit links, assign categories, and fetch metadata.
- Categories: create, rename, and delete categories.
- Notes: create and manage notes.
- Layout: change grid columns and compact mode.
- Appearance: change name, subtitle, footer, fonts, and colours.
- Security: update login credentials and manage backups.
  backup ui
<img width="1058" height="719" alt="image" src="https://github.com/user-attachments/assets/9f395ced-7ab3-42ef-8e7d-58b51d68473d" />
landing page ui
<img width="2559" height="1324" alt="image" src="https://github.com/user-attachments/assets/19c91933-7787-46aa-aa2f-ffb64287c50e" />
admin ui
<img width="1065" height="472" alt="image" src="https://github.com/user-attachments/assets/6646a807-caf5-40f1-82be-e1a01bc62ce3" />
categories
<img width="1056" height="552" alt="image" src="https://github.com/user-attachments/assets/0c9d3fea-4083-428c-ab63-8750fa14a5e3" />
notes
<img width="1054" height="362" alt="image" src="https://github.com/user-attachments/assets/5589d97c-0727-42e8-a294-f8db9cf21fa1" />
layout settings
<img width="1054" height="301" alt="image" src="https://github.com/user-attachments/assets/3fa4f2f3-9768-45a0-a5ae-a062e9639b1d" />
appearance
<img width="1083" height="888" alt="image" src="https://github.com/user-attachments/assets/56ff268d-28c2-4ac2-adee-8b172ea90ef5" />
security ui
<img width="1059" height="526" alt="image" src="https://github.com/user-attachments/assets/c6fb4f4b-b672-4a73-ae69-3fa0792915ef" />








## Backups

The app stores everything in a single JSON file, so backup and restore are simple.

In the Security tab you can:

- Download a full JSON backup.
- Import a previously saved backup file.

If you want to back up the file manually from Docker, the data lives at `/data/jarvis.json` inside the container.

## Configuration

Edit `docker-compose.yml` to customise the runtime settings:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port the app listens on |
| `DATA_FILE` | `/data/jarvis.json` | Path to the persisted JSON data file |
| `DEFAULT_USERNAME` | `admin` | Username used on first boot if no data file exists |
| `DEFAULT_PASSWORD` | `admin` | Password used on first boot if no data file exists |
| `SESSION_SECRET` | `change-me-in-production` | Secret used to sign login sessions |

Change `SESSION_SECRET` to a long random value before exposing the app to other users.

Example:

```bash
openssl rand -hex 32
```

## Docker Deployment

The included `docker-compose.yml` pulls the image from GitHub Container Registry using a version tag such as `1.0.3`.

That means:

- The image does not float on `latest` by default.
- You can pin a specific release in Compose.
- The GitHub Actions workflow still publishes both the version tag and `latest`.

To update to a new release, change the version in `docker-compose.yml` and restart the container.

## Updating

If you are running from source or building locally:

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

Your data file is not removed during an update.

## Running on a Different Port

Change the port mapping in `docker-compose.yml`:

```yaml
ports:
  - "8080:3000"
```

Then the app will be available on port `8080` on the host.

## Data and Security Notes

- Links, notes, categories, credentials, settings, and appearance are all stored in the JSON data file.
- Credentials are stored in plaintext in the data file, so this is intended for a private LAN use case.
- Sessions expire after 8 hours.
- If you expose the app publicly, place it behind HTTPS and a reverse proxy such as Caddy or Nginx.

## Versioning

The displayed UI version, `package.json`, Docker image tag, and Compose file should stay aligned. When you bump the app version, update all of them together so you always know what is running.




