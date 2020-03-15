<!DOCTYPE html>
<html>
<body>

<h1><b>Run container:</b></h1>
<p>docker build -t container-name . </p>
<p>docker run -p 8080:8080 -t container-name</p>
<p><b>Stop, delete container:</b></p>
<p>docker stop $(docker ps -a -q)</p>
<p>docker rm $(docker ps -a -q -f status=exited)</p>
</body>
</html>
