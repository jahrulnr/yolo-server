FROM golang:1-alpine AS builder
COPY yolo-server /app
WORKDIR /app
ENV GOOS=linux \
	CGO_ENABLED=0 \
	GO111MODULE=on \
	GOOS=linux
RUN go build -o server cmd/main.go && chmod +x server

FROM python:3.9.23-slim-trixie
COPY requirements.txt /tmp/
ENV CUDA_VISIBLE_DEVICES=-1
RUN apt update && apt install -y libgl1 libglib2.0-bin \
	&& pip install --no-cache-dir -r /tmp/requirements.txt \
	 -f https://download.pytorch.org/whl/cpu/torch_stable.html \
# RUN yolo predict model=yolo11n.pt source='https://ultralytics.com/images/bus.jpg'
	&& rm -rf /var/cache/apt/archives /var/lib/apt/lists/* \
	&& apt-get clean

WORKDIR /app
COPY python /app
COPY --from=builder /app/server /app/
RUN addgroup --gid 1000 apps \
	&& adduser --uid 1000 --gid 1000 --disabled-password --gecos "" apps \
	&& mkdir /app/tmp \
	&& chown -R apps:apps /app
USER apps

EXPOSE 8080
CMD ["/app/server"]