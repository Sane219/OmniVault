module default {
  scalar type DocumentType extending enum<PDF, Audio, Video>;
  scalar type DocumentStatus extending enum<Uploaded, Processing, Ready>;

  type User {
    required property email -> str {
      constraint exclusive;
    }
    required property hashed_password -> str;
    required property created_at -> datetime {
      default := datetime_current();
    }
    property gemini_api_key -> str;
  }

  type Workspace {
    required property name -> str;
    required link owner -> User;
    multi link members -> User;
  }

  type Document {
    required property title -> str;
    required property file_url -> str;
    required property document_type -> DocumentType;
    required property status -> DocumentStatus {
      default := DocumentStatus.Uploaded;
    }
    required link workspace -> Workspace;
  }
}
