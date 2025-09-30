imagename = yolov5

build:
	docker build . -t ${imagename}:amd64 --platform amd64
	docker build . -t ${imagename}:arm64 --platform arm64

save:
	docker save ${imagename} | gzip > ${imagename}.tar.gz

up: build
	docker compose up -d

down:
	docker compose down --remove-orphans
