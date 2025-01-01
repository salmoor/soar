# Database Schema Documentation

```mermaid
erDiagram
    User {
        ObjectId *id PK
        String username "unique"
        String password
        String email "unique" 
        String role "enum[superadmin,schoolAdmin]"
        ObjectId schoolId FK "optional"
        Date createdAt
        Date updatedAt
    }
    
    School {
        ObjectId *id PK
        String name
        String address
        String profileInfo.email
        String profileInfo.phone
        Date createdAt
        Date updatedAt
    }
    
    Classroom {
        ObjectId *id PK
        ObjectId schoolId FK
        String name
        Number capacity
        String[] resources
        Date createdAt
        Date updatedAt
    }
    
    Student {
        ObjectId *id PK
        ObjectId schoolId FK
        ObjectId classroomId FK "optional"
        String firstName
        String lastName 
        String email "unique"
        Date dateOfBirth
        Date enrollmentDate
        Object[] transferHistory
        Date createdAt
        Date updatedAt
    }
    
    School ||--o{ User : "has"
    School ||--o{ Classroom : "contains"
    School ||--o{ Student : "enrolls"
    Classroom ||--o{ Student : "has"
```
## Collections

### User Collection
```javascript
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ['superadmin', 'schoolAdmin'], required: true },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: false },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });
```

### School Collection
```javascript
const SchoolSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    profileInfo: {
        email: String,
        phone: String
    },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });
```

### Classroom Collection
```javascript
const ClassroomSchema = new mongoose.Schema({
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    name: { type: String, required: true },
    capacity: { type: Number, required: true },
    resources: [String],
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });
```

### Student Collection
```javascript
const StudentSchema = new mongoose.Schema({
    schoolId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'School', 
        required: true 
    },
    classroomId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Classroom',
        required: false
    },
    firstName: { 
        type: String, 
        required: true 
    },
    lastName: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true,
        unique: true
    },
    dateOfBirth: { 
        type: Date, 
        required: true 
    },
    enrollmentDate: { 
        type: Date, 
        default: Date.now 
    },
    transferHistory: [{
        fromSchool: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
        toSchool: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
        date: { type: Date, default: Date.now },
        reason: String
    }]
}, { timestamps: true });
```

## Indexes

1. User Collection:
   - `username`: Unique index (from `unique: true`)
   - `email`: Unique index (from `unique: true`)

2. Student Collection:
   - `email`: Unique index (from `unique: true`)

## Relationships

1. User -> School:
   - Optional reference through `schoolId` (for school administrators)
   - References 'School' collection

2. Classroom -> School:
   - Required reference through `schoolId`
   - References 'School' collection

3. Student -> School:
   - Required reference through `schoolId`
   - References 'School' collection

4. Student -> Classroom:
   - Optional reference through `classroomId`
   - References 'Classroom' collection

## Timestamps
All collections use Mongoose's `timestamps: true` option, which automatically manages:
- `createdAt`: Set on document creation
- `updatedAt`: Updated on document modification
