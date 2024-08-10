import requests
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status


@api_view(["POST"])
def login(request):
    token = request.data.get("token")
    if not token:
        return Response(
            {"error": "Token is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    headers = {"Authorization": f"PersonalAccessToken {token}"}
    response = requests.get("https://api.angelcam.com/v1/me/", headers=headers)

    if response.status_code == 200:
        return Response(response.json())
    else:
        return Response(response.json(), status=response.status_code)

@api_view(["POST"])
def cameras(request):
    token = request.data.get("token")
    if not token:
        return Response(
            {"error": "Token is required for this action"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    headers = {"Authorization": f"PersonalAccessToken {token}"}
    response = requests.get(
        "https://api.angelcam.com/v1/shared-cameras/", headers=headers
    )

    if response.status_code == 200:
        return Response(response.json())
    else:
        return Response(response.json(), status=response.status_code)

@api_view(["POST"])
def recordings(request):
    token = request.data.get("token")
    if not token:
        return Response(
            {"error": "Token is required for this action"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    camId = request.data.get("camId")
    if not camId:
        return Response(
            {"error": "Camera ID is required for this action"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    headers = {"Authorization": f"PersonalAccessToken {token}"}
    response = requests.get(
        f"https://api.angelcam.com/v1/shared-cameras/{camId}/recording/", headers=headers
    )

    if response.status_code == 200:
        return Response(response.json())
    else:
        return Response(response.json(), status=response.status_code)

