Docker commands:
docker build -t container-name .
docker run -p 8080:8080 -t container-name

***
docker stop $(docker ps -a -q)
docker rm $(docker ps -a -q -f status=exited)