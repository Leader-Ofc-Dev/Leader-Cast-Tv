
import os
import platform
import getpass
import socket
import uuid
import datetime

print("====== Vithu user conclusion======")

print("Username       :", getpass.getuser())
print("Computer Name  :", socket.gethostname())
print("Operating Sys  :", platform.system())
print("OS Version     :", platform.version())
print("Architecture   :", platform.machine())
print("Python Version :", platform.python_version())
print("Current Folder :", os.getcwd())
print("Date & Time    :", datetime.datetime.now())

print("================================")
