FROM python:3.9

WORKDIR /app
copy ./requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt
EXPOSE 5000

## Add the wait script to the image
# ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.9.0/wait /wait
# RUN chmod +x /wait
#https://github.com/vishnubob/wait-for-it
ADD wait.sh /wait.sh
RUN chmod +x /wait.sh

ENTRYPOINT ["/wait.sh", "mariadb:3306", "--", "python3", "main.py"]
