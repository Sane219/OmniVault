module default {
  scalar type DocumentType extending enum<PDF, Audio, Video>;
  scalar type DocumentStatus extending enum<Uploaded, Processing, Completed, Failed>;

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
    required property document_type -> DocumentType {
      default := DocumentType.PDF;
    }
    required property status -> DocumentStatus {
      default := DocumentStatus.Uploaded;
    }
    required property created_at -> datetime {
      default := datetime_current();
    }
    # Optional: linked to a workspace for multi-user access
    link workspace -> Workspace;
    # Direct owner link for quick single-user lookups
    required link owner -> User;
    # Set when AI processing fails
    property error_message -> str;
    # Stores the full knowledge graph JSON produced by the AI worker
    property graph_data -> json;
  }
}
