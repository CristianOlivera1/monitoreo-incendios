package com.example.monitoreo_incendios.Business;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

import java.io.IOException;

@Service
public class SupabaseStorageService {

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.apiKey}")
    private String supabaseApiKey;

    @Value("${supabase.bucket}")
    private String bucketName;

    @Value("${supabase.bucket2}")
    private String bucketName2;

    //esto es para subir archivos(iamgenes y videos del reporte)
    public String uploadFileToBucket2(byte[] fileBytes, String path, String contentType) {
      try {
        String filePath = path;

        String url = supabaseUrl + "/storage/v1/object/" + bucketName2 + "/" + filePath;

        var client = java.net.http.HttpClient.newHttpClient();
        var request = java.net.http.HttpRequest.newBuilder()
            .uri(java.net.URI.create(url))
            .header("Authorization", "Bearer " + supabaseApiKey)
            .header("Content-Type", contentType)
            .PUT(java.net.http.HttpRequest.BodyPublishers.ofByteArray(fileBytes))
            .build();

        var response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 200) {
          return supabaseUrl + "/storage/v1/object/public/" + bucketName2 + "/" + filePath;
        } else {
          throw new RuntimeException("Error al subir archivo a Supabase bucket2: " + response.body());
        }
      } catch (IOException | InterruptedException e) {
        throw new RuntimeException("Error al subir archivo a Supabase bucket2: " + e.getMessage());
      }
    }

    //esto es para subir archivos(imagenes) de su foto de perfil
    public String uploadFileUrl(byte[] fileBytes, String path, String contentType) {
        try {
            String filePath = path;

            String url = supabaseUrl + "/storage/v1/object/" + bucketName + "/" + filePath;

            // Realizar la solicitud HTTP
            var client = java.net.http.HttpClient.newHttpClient();
            var request = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create(url))
                    .header("Authorization", "Bearer " + supabaseApiKey)
                    .header("Content-Type", contentType)
                    .PUT(java.net.http.HttpRequest.BodyPublishers.ofByteArray(fileBytes))
                    .build();

            var response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                // Retornar la URL pública
                return supabaseUrl + "/storage/v1/object/public/" + bucketName + "/" + filePath;
            } else {
                throw new RuntimeException("Error al subir archivo a Supabase: " + response.body());
            }
        } catch (IOException | InterruptedException e) {
            throw new RuntimeException("Error al subir archivo a Supabase: " + e.getMessage());
        }
    }
}
