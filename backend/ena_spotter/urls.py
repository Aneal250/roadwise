from django.urls import include, path
from django.views.generic import RedirectView
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from planner.views import favicon

urlpatterns = [
    path("", RedirectView.as_view(url="/api/docs/", permanent=False), name="home"),
    path("favicon.ico", favicon, name="favicon"),
    path("api/", include("planner.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]
