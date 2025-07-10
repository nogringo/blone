# Blone

Blone is a blossom server that store files on an rclone remote

## Installing

1) Copy `compose.yml` on your server
2) Create a `.env` file with your settings
3) Run `docker compose up -d`
5) Run `docker compose exec rclone sh`
6) Add a remote named `bucket`
7) Run `exit`

## Dashboard

Your Blone dashboard is available at `https://your.domain/dashboard/index.html`

## Todo

- [x] Server gui

## Contributing

Contributions are welcome! Please open issues or submit pull requests.